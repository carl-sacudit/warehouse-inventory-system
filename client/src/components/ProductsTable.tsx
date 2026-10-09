
import {
  Search,
  Package,
  Pencil,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import type { Product } from "../services/productService";

interface ProductsTableProps {
  products: Product[];
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
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
  loading,
  canEdit,
  canDelete,
}: ProductsTableProps) {
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

  return (
    <section className="products-panel">
      <div className="products-panel-header">
        <div>
          <h2>Inventory Products</h2>
          <p>Manage and monitor your warehouse inventory.</p>
        </div>

        <div className="products-count">
          <Package size={16} />
          <span>{products.length} products</span>
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

        <div className="products-toolbar-label">
          <ArrowUpDown size={15} />
          <span>Inventory list</span>
        </div>
      </div>

      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Status</th>
              {hasActions && (
                <th className="actions-heading">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={hasActions ? 7 : 6} className="table-message">
                  <span className="loading-spinner" />
                  Loading inventory...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={hasActions ? 7 : 6} className="table-message">
                  <div className="empty-products">
                    <Package size={32} />
                    <strong>No products found</strong>
                    <span>
                      Try another search or add a new product.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const status = getStockStatus(product);

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name-cell">
                        <div className="product-avatar">
                          <Package size={19} />
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
                      <div className="product-quantity">
                        <strong>{product.quantity}</strong>
                        <span>units</span>
                      </div>
                    </td>

                    <td>
                      <span className="product-price">
                        {formatCurrency(product.unit_price)}
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
                              onClick={() => onDelete(product)}
                            >
                              <Trash2 size={16} />
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
          Showing {products.length}{" "}
          {products.length === 1 ? "product" : "products"}
        </span>
        <span>StockFlow Inventory</span>
      </div>
    </section>
  );
}

export default ProductsTable;