
import { useMemo } from "react";
import {
  Search,
  Package,
  Pencil,
  Trash2,
  ArrowUpDown,
  Tags,
  LoaderCircle,
} from "lucide-react";
import { getProductImageUrl, type Product } from "../services/productService";

interface ProductsTableProps {
  products: Product[];
  categories: string[];
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  deletingProductId: number | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function ProductsTable({
  products,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  deletingProductId,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
  loading,
  canEdit,
  canDelete,
}: ProductsTableProps) {
  const visibleProducts = useMemo(
    () => categoryFilter
      ? products.filter(
          (product) => (product.category_name || "Uncategorized") === categoryFilter
        )
      : products,
    [products, categoryFilter]
  );

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  };

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0) {
      return {
        label: "Out of Stock",
        className: "stock-status-out",
      };
    }

    if (product.quantity <= product.reorder_level) {
      return {
        label: "Low Stock",
        className: "stock-status-low",
      };
    }

    return {
      label: "In Stock",
      className: "stock-status-in",
    };
  };

  const hasActions = canEdit || canDelete;
  const columnCount = hasActions ? 9 : 8;

  return (
    <section className="products-panel">
      <div className="products-panel-header">
        <div>
          <h2>Inventory Products</h2>
          <p>Manage and monitor your warehouse inventory.</p>
        </div>

        <div className="products-count">
          <Package size={16} />
          <span>{visibleProducts.length} products</span>
        </div>
      </div>

      <div className="products-toolbar">
        <div className="products-search">
          <Search size={18} />

          <input
            type="search"
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            aria-label="Search products"
          />
        </div>

        <div className="products-toolbar-right">
          <label className="products-category-filter">
            <Tags size={15} />
            <select
              value={categoryFilter}
              onChange={(event) => onCategoryFilterChange(event.target.value)}
              aria-label="Filter products by category"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="products-toolbar-label">
            <ArrowUpDown size={15} />
            <span>Inventory list</span>
          </div>
        </div>
      </div>

      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Supplier / Source</th>
              <th>Quantity</th>
              <th>Supplier SRP</th>
              <th>Selling Price</th>
              <th>Status</th>
              {hasActions && (
                <th className="actions-heading">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="table-message">
                  <span className="loading-spinner" />
                  Loading inventory...
                </td>
              </tr>
            ) : visibleProducts.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="table-message">
                  <div className="empty-products">
                    <Package size={32} />
                    <strong>
                      {categoryFilter ? "No products in this category" : "No products found"}
                    </strong>
                    <span>
                      {categoryFilter
                        ? "Choose another category or show all categories."
                        : "Try another search or add a new product."}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              visibleProducts.map((product) => {
                const status = getStockStatus(product);

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name-cell">
                        <div className="product-avatar">
                          <Package size={19} />
                          {product.image_url && (
                            <img
                              src={getProductImageUrl(product.image_url)}
                              alt=""
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </div>

                        <div className="product-name-info">
                          <strong>{product.name}</strong>
                          <span>
                            {product.description ||
                              "No description provided"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="product-sku">
                        {product.sku}
                      </span>
                    </td>

                    <td>
                      <span className="product-category">
                        {product.category_name || "Uncategorized"}
                      </span>
                    </td>

                    <td>
                      <span className="product-category">
                        {product.supplier_name || "Unassigned"}
                      </span>
                    </td>

                    <td>
                      <div className="product-quantity">
                        <strong>{product.quantity}</strong>
                        <span>units</span>
                      </div>
                    </td>

                    <td>
                      <span className="product-price">
                        {formatCurrency(product.supplier_srp)}
                      </span>
                    </td>

                    <td>
                      <span className="product-price">
                        {formatCurrency(product.selling_price)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`stock-status ${status.className}`}
                      >
                        <span className="stock-status-dot" />
                        {status.label}
                      </span>
                    </td>

                    {hasActions && (
                      <td>
                        <div className="product-actions">
                          {canEdit && (
                            <button
                              type="button"
                              className="table-action-button edit-action"
                              title={`Edit ${product.name}`}
                              aria-label={`Edit ${product.name}`}
                              onClick={() => onEdit(product)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              className="table-action-button delete-action"
                              title={`Delete ${product.name}`}
                              aria-label={`Delete ${product.name}`}
                              disabled={deletingProductId !== null}
                              onClick={() => onDelete(product)}
                            >
                              {deletingProductId === product.id ? (
                                <LoaderCircle size={16} className="action-spinner" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="products-panel-footer">
        <span>
          Showing {visibleProducts.length}{" "}
          {visibleProducts.length === 1 ? "product" : "products"}
        </span>
        <span>StockFlow Inventory</span>
      </div>
    </section>
  );
}

export default ProductsTable;