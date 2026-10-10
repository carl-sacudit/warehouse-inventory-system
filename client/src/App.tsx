
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  Boxes,
  Wallet,
  AlertTriangle,
  Plus,
  Bell,
  Menu,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import ProductsTable from "./components/ProductsTable";
import ProductModal from "./components/ProductModal";
import Login from "./components/Login";
import StockMovements from "./components/StockMovements";

import { authService, type AuthUser } from "./services/authService";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./services/productService";

import type {
  Product,
  ProductInput,
} from "./services/productService";

import "./App.css";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const canManageProducts =
    user?.role === "ADMIN" ||
    user?.role === "WAREHOUSE_MANAGER";

  const canDeleteProducts = user?.role === "ADMIN";

  const canManageStock = canManageProducts;

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

    setError("");

    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load inventory products."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const totalProducts = products.length;

  const totalUnits = products.reduce(
    (total, product) => total + Number(product.quantity || 0),
    0
  );

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.quantity || 0) *
        Number(product.unit_price || 0),
    0
  );

  const lowStockCount = products.filter(
    (product) =>
      Number(product.quantity) <= Number(product.reorder_level)
  ).length;

  const lowStockProducts = products
  .filter(
    (product) =>
      Number(product.quantity) <= Number(product.reorder_level)
  )
  .sort(
    (a, b) =>
      Number(a.quantity) - Number(b.quantity)
  );

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-PH").format(value);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    }).format(value);

  const openCreateModal = () => {
    if (!canManageProducts) {
      setError("You do not have permission to create products.");
      return;
    }

    setError("");
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    if (!canManageProducts) {
      setError("You do not have permission to edit products.");
      return;
    }

    setError("");
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = async (data: ProductInput) => {
    if (!canManageProducts) {
      setError("You do not have permission to modify products.");
      return;
    }

    try {
      setError("");

      if (selectedProduct) {
        await updateProduct(selectedProduct.id, data);
        setNotice("Product updated successfully.");
      } else {
        await createProduct(data);
        setNotice("Product created successfully.");
      }

      closeModal();
      await loadProducts(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the product."
      );
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!canDeleteProducts) {
      setError("Only administrators can delete products.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await deleteProduct(product.id);
      setNotice("Product deleted successfully.");
      await loadProducts(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the product."
      );
    }
  };

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setSearchQuery("");
    setError("");
    setNotice("");
    setSidebarOpen(false);

    if (
      page !== "Dashboard" &&
      page !== "Products" &&
      page !== "Stock Movements"
    ) {
      setNotice(`${page} module is coming soon.`);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setProducts([]);
      setLoading(false);
      setRefreshing(false);
      setError("");
      setSearchQuery("");
      setSelectedProduct(null);
      setIsModalOpen(false);
      setActivePage("Dashboard");
      setNotice("");
    }
  };

  // Conditional rendering happens after all hooks.
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

  const isStockMovementsPage = activePage === "Stock Movements";

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={() => void handleLogout()}
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
              onClick={() =>
                setNotice("You are all caught up on notifications.")
              }
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
            <StockMovements canManageStock={canManageStock} />
          ) : (
            <>
              <section className="page-heading">
                <div className="page-heading-copy">
                  <div className="eyebrow">
                    <LayoutDashboard size={15} />
                    WAREHOUSE OVERVIEW
                  </div>

                  <h1>
                    {activePage === "Dashboard"
                      ? "Inventory Dashboard"
                      : activePage}
                  </h1>

                  <p>
                    Monitor your stock, track inventory levels, and
                    manage warehouse products in one place.
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
                      className={refreshing ? "refresh-spinning" : ""}
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

              {error && (
                <div className="app-alert app-alert-error" role="alert">
                  <AlertTriangle size={19} />

                  <div>
                    <strong>Something went wrong</strong>
                    <p>{error}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadProducts(true)}
                  >
                    Retry
                  </button>
                </div>
              )}

              {notice && (
                <div className="app-alert app-alert-info" role="status">
                  <span>{notice}</span>

                  <button
                    type="button"
                    aria-label="Dismiss message"
                    onClick={() => setNotice("")}
                  >
                    ×
                  </button>
                </div>
              )}

              <section className="stats-grid">
                <StatCard
                  title="Total Products"
                  value={loading ? "—" : formatNumber(totalProducts)}
                  subtitle="Registered inventory items"
                  icon={Package}
                  color="blue"
                />



                <StatCard
                  title="Total Units"
                  value={loading ? "—" : formatNumber(totalUnits)}
                  subtitle="Units currently in stock"
                  icon={Boxes}
                  color="green"
                />

                <StatCard
                  title="Inventory Value"
                  value={loading ? "—" : formatCurrency(inventoryValue)}
                  subtitle="Estimated value of current stock"
                  icon={Wallet}
                  color="purple"
                />

                <StatCard
                  title="Low Stock"
                  value={loading ? "—" : formatNumber(lowStockCount)}
                  subtitle="Items at or below reorder level"
                  icon={AlertTriangle}
                  color="orange"
                />
              
{lowStockProducts.length > 0 && (
  <section className="low-stock-panel">
    <div className="low-stock-panel-header">
      <div>
        <h2>Low-Stock Alerts</h2>
        <p>Products that need replenishment</p>
      </div>

      <span className="low-stock-count">
        {lowStockProducts.length}{" "}
        {lowStockProducts.length === 1 ? "item" : "items"}
      </span>
    </div>

    <div className="low-stock-table-wrapper">
      <table className="low-stock-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Current Stock</th>
            <th>Reorder Level</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {lowStockProducts.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="low-stock-product-info">
                  <strong>{product.name}</strong>
                  <span>SKU: {product.sku}</span>
                </div>
              </td>

              <td>
                <strong>{product.quantity}</strong>
              </td>

              <td>{product.reorder_level}</td>

              <td>
                <span className="low-stock-badge">
                  {Number(product.quantity) === 0
                    ? "Out of Stock"
                    : "Low Stock"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}


                
              </section>

              <ProductsTable
                products={filteredProducts}
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
            <span>© {new Date().getFullYear()} StockFlow</span>
            <span>Warehouse Inventory Management System</span>
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