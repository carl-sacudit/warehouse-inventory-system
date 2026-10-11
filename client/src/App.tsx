
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Bell,
  Menu,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProductsTable from "./components/ProductsTable";
import ProductModal from "./components/ProductModal";
import Login from "./components/Login";
import StockMovements from "./components/StockMovements";
import Suppliers from "./components/Suppliers";
import PurchaseOrders from "./components/PurchaseOrders";
import SalesOrders from "./components/SalesOrders";
import ProductThumbnail from "./components/ProductThumbnail.tsx";
import Categories from "./components/Categories.tsx";
import { useToast } from "./components/ToastProvider.tsx";

import { authService, type AuthUser } from "./services/authService";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type ProductInput,
} from "./services/productService";

import "./App.css";

function App() {
  const notify = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Role permissions
  const canManageSuppliers =
    user?.role === "ADMIN" ||
    user?.role === "WAREHOUSE_MANAGER";

  const canDeleteSuppliers = user?.role === "ADMIN";

  const canManageProducts =
    user?.role === "ADMIN" ||
    user?.role === "WAREHOUSE_MANAGER";

  const canDeleteProducts = user?.role === "ADMIN";

  const canManageStock = canManageProducts;

  // Purchase orders can be created and managed by administrators
  // and warehouse managers. Receiving permissions are enforced
  // separately by the backend for authorized users.
  const canManagePurchaseOrders = canManageSuppliers;

  // Restore the authenticated session when the app starts.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const currentUser = await authService.getCurrentUser();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load products after authentication has been checked.
  const loadProducts = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      notify("error",
        err instanceof Error
          ? err.message
          : "Unable to load inventory products."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    if (authLoading || !user) return;

    const timer = setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => clearTimeout(timer);
  }, [user, authLoading, loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.category_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [products, searchQuery]);

  const productCategories = useMemo(
    () => [...new Set(products.map((product) => product.category_name || "Uncategorized"))]
      .sort((first, second) => first.localeCompare(second)),
    [products]
  );

  const lowStockProducts = useMemo(
    () => products
      .filter(
        (product) => Number(product.quantity) <= Number(product.reorder_level)
      )
      .sort(
        (first, second) => Number(first.quantity) - Number(second.quantity)
      ),
    [products]
  );

  const openCreateModal = () => {
    if (!canManageProducts) {
      notify("error", "You do not have permission to create products.");
      return;
    }

    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    if (!canManageProducts) {
      notify("error", "You do not have permission to edit products.");
      return;
    }

    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = async (data: ProductInput) => {
    if (!canManageProducts) {
      notify("error", "You do not have permission to modify products.");
      return;
    }

    try {
      if (selectedProduct) {
        await updateProduct(selectedProduct.id, data);
        notify("success", "Product updated successfully.");
      } else {
        await createProduct(data);
        notify("success", "Product created successfully.");
      }

      closeModal();
      await loadProducts(true);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!canDeleteProducts) {
      notify("error", "Only administrators can delete products.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setDeletingProductId(product.id);
    try {
      await deleteProduct(product.id);
      notify("success", "Product deleted successfully.");
      await loadProducts(true);
    } catch (err) {
      notify("error",
        err instanceof Error
          ? err.message
          : "Unable to delete the product."
      );
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setSearchQuery("");
    setCategoryFilter("");
    setSidebarOpen(false);

    const availablePages = [
      "Dashboard",
      "Products",
      "Categories",
      "Stock Movements",
      "Suppliers",
      "Purchase Orders",
      "Sales Orders",
    ];

    if (!availablePages.includes(page)) {
      notify("info", `${page} module is coming soon.`);
    }
  };

  const handleViewCategoryProducts = (categoryName: string) => {
    setActivePage("Products");
    setSearchQuery("");
    setCategoryFilter(categoryName);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
      notify("error", "Unable to log out cleanly. Please try again.");
    } finally {
      setUser(null);
      setProducts([]);
      setLoading(false);
      setRefreshing(false);
      setSearchQuery("");
      setSelectedProduct(null);
      setIsModalOpen(false);
      setActivePage("Dashboard");
      setLoggingOut(false);
    }
  };

  // Wait until authentication has been checked.
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner" />
        <span>Restoring your StockFlow session...</span>
      </div>
    );
  }

  if (!user) {
    return <Login onAuthenticated={setUser} />;
  }

  const isStockMovementsPage =
    activePage === "Stock Movements";

  const isSuppliersPage =
    activePage === "Suppliers";

  const isCategoriesPage =
    activePage === "Categories";

  const isPurchaseOrdersPage =
    activePage === "Purchase Orders";

  const isSalesOrdersPage =
    activePage === "Sales Orders";

  const isDashboardPage =
    activePage === "Dashboard";

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={() => void handleLogout()}
        isLoggingOut={loggingOut}
      />

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="system-status">
              <span className="system-status-dot" />
              Inventory System
            </span>

            <button
              type="button"
              className="notification-button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => notify("info", "You are all caught up on notifications.")}
            >
              <Bell size={19} />
            </button>

            <div className="topbar-avatar" title={user.full_name}>
              {user.full_name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("")}
            </div>
          </div>
        </header>

        <div className="page-content">
          {isStockMovementsPage ? (
            <StockMovements
              canManageStock={canManageStock}
            />
          ) : isSuppliersPage ? (
            <Suppliers
              canManageSuppliers={canManageSuppliers}
              canDeleteSuppliers={canDeleteSuppliers}
            />
          ) : isCategoriesPage ? (
            <Categories
              canManageCategories={canManageProducts}
              onViewProducts={handleViewCategoryProducts}
            />
          ) : isPurchaseOrdersPage ? (
            <PurchaseOrders
              canManagePurchaseOrders={canManagePurchaseOrders}
            />
          ) : isSalesOrdersPage ? (
            <SalesOrders />
          ) : isDashboardPage ? (
            <Dashboard
              products={products}
              productsLoading={loading}
              canManageProducts={canManageProducts}
              onAddProduct={openCreateModal}
              onRefreshProducts={() => loadProducts(true)}
              onNavigate={handleNavigate}
            />
          ) : (
            <>
              <section className="page-heading">
                <div className="page-heading-copy">
                  <div className="eyebrow">
                    <LayoutDashboard size={15} />
                    WAREHOUSE OVERVIEW
                  </div>

                  <h1>{activePage}</h1>

                  <p>
                    Manage warehouse products, prices, and inventory levels.
                  </p>
                </div>

                <div className="page-heading-actions">
                  <button
                    type="button"
                    className="button-secondary refresh-button"
                    disabled={refreshing || loading}
                    onClick={() => void loadProducts(true)}
                  >
                    <RefreshCw
                      size={17}
                      className={
                        refreshing ? "refresh-spinning" : ""
                      }
                    />
                    Refresh
                  </button>

                  {canManageProducts && (
                    <button
                      type="button"
                      className="button-primary"
                      onClick={openCreateModal}
                    >
                      <Plus size={18} />
                      Add Product
                    </button>
                  )}
                </div>
              </section>

              {lowStockProducts.length > 0 && (
                <section className="low-stock-panel" aria-labelledby="products-low-stock-title">
                  <div className="low-stock-panel-header">
                    <div>
                      <h2 id="products-low-stock-title">Low stock alerts</h2>
                      <p>Products at or below their reorder level.</p>
                    </div>
                    <span className="low-stock-count">
                      {lowStockProducts.length} {lowStockProducts.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="low-stock-list">
                    {lowStockProducts.map((product) => (
                      <article className="low-stock-item" key={product.id}>
                        <div className="low-stock-product-info">
                          <ProductThumbnail
                            imageUrl={product.image_url}
                            className="low-stock-thumb"
                          />
                          <div className="low-stock-product-copy">
                            <strong>{product.name}</strong>
                            <span>SKU: {product.sku}</span>
                          </div>
                        </div>

                        <div className="low-stock-quantity">
                          <span>Current stock</span>
                          <strong>{product.quantity} units</strong>
                        </div>

                        <div className="low-stock-reorder">
                          <span>Reorder level</span>
                          <strong>{product.reorder_level} units</strong>
                        </div>

                        <span className="low-stock-badge">
                          {Number(product.quantity) === 0 ? "Out of stock" : "Low stock"}
                        </span>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <ProductsTable
                products={filteredProducts}
                categories={productCategories}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                deletingProductId={deletingProductId}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onEdit={openEditModal}
                onDelete={(product) =>
                  void handleDeleteProduct(product)
                }
                loading={loading}
                canEdit={canManageProducts}
                canDelete={canDeleteProducts}
              />
            </>
          )}

          <footer className="app-footer">
            <span>
              © {new Date().getFullYear()} StockFlow
            </span>
            <span>
              Warehouse Inventory Management System
            </span>
          </footer>
        </div>
      </main>

      <ProductModal
        isOpen={isModalOpen}
        product={selectedProduct}
        onClose={closeModal}
        onSubmit={handleSaveProduct}
      />
    </div>
  );
}

export default App;
