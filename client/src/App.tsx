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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");

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
  let cancelled = false;

  async function fetchInitialProducts() {
    try {
      const data = await getProducts();

      if (!cancelled) {
        setProducts(data);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inventory products."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void fetchInitialProducts();

  return () => {
    cancelled = true;
  };
}, []);

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

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-PH").format(value);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    }).format(value);

  const openCreateModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = async (data: ProductInput) => {
    if (selectedProduct) {
      await updateProduct(selectedProduct.id, data);
      setNotice("Product updated successfully.");
    } else {
      await createProduct(data);
      setNotice("Product created successfully.");
    }

    closeModal();
    await loadProducts(true);
  };

  const handleDeleteProduct = async (product: Product) => {
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

    if (page === "Dashboard" || page === "Products") {
      setNotice("");
      return;
    }

    setNotice(`${page} module is coming soon.`);
  };

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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

            <div className="topbar-avatar">CB</div>
          </div>
        </header>

        <div className="page-content">
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

              <button
                type="button"
                className="button-primary"
                onClick={openCreateModal}
              >
                <Plus size={18} />
                Add Product
              </button>
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
          </section>

          <ProductsTable
            products={filteredProducts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onEdit={openEditModal}
            onDelete={(product) => void handleDeleteProduct(product)}
            loading={loading}
          />

          <footer className="app-footer">
            <span>
              © {new Date().getFullYear()} StockFlow
            </span>
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
