import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
ArrowDownToLine,
ArrowUpFromLine,
RefreshCw,
Package,
History,
Search,
} from "lucide-react";
import {
createStockMovement,
getStockMovements,
type MovementType,
type StockMovement,
} from "../services/stockMovementService";
import "./StockMovements.css";

interface ProductOption {
id: number;
name: string;
sku: string;
quantity: number;
}

interface ProductsResponse {
success: boolean;
data: ProductOption[];
}

interface StockMovementsProps {
canManageStock: boolean;
}

const PRODUCTS_API = "http://localhost:5001/api/products";

export default function StockMovements({
canManageStock,
}: StockMovementsProps) {
const [movements, setMovements] = useState<StockMovement[]>([]);
const [products, setProducts] = useState<ProductOption[]>([]);
const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const [search, setSearch] = useState("");
const [movementType, setMovementType] = useState<MovementType>("IN");
const [productId, setProductId] = useState("");
const [quantity, setQuantity] = useState("1");
const [referenceNote, setReferenceNote] = useState("");

const loadData = useCallback(async () => {
setLoading(true);
setError("");

try {
  const [movementData, productResponse] = await Promise.all([
    getStockMovements(),
    fetch(PRODUCTS_API, { credentials: "include" }),
  ]);

  const productResult = (await productResponse.json()) as ProductsResponse;

  if (!productResponse.ok || !productResult.success) {
    throw new Error("Unable to load products.");
  }

  setMovements(movementData);
  setProducts(productResult.data);

  setProductId((current) => {
    if (current && productResult.data.some((p) => String(p.id) === current)) {
      return current;
    }
    return productResult.data.length ? String(productResult.data[0].id) : "";
  });
} catch (err) {
  setError(
    err instanceof Error ? err.message : "Failed to load stock movements."
  );
} finally {
  setLoading(false);
}

}, []);

useEffect(() => {
  let cancelled = false;

  async function initialize() {
    if (cancelled) return;
    await loadData();
  }

  void initialize();

  return () => {
    cancelled = true;
  };
}, [loadData]);

const selectedProduct = products.find(
(product) => String(product.id) === productId
);

const filteredMovements = movements.filter((movement) => {
const term = search.trim().toLowerCase();

return (
  !term ||
  movement.product_name.toLowerCase().includes(term) ||
  movement.sku.toLowerCase().includes(term) ||
  (movement.reference_note ?? "").toLowerCase().includes(term) ||
  movement.movement_type.toLowerCase().includes(term)
);

});

const totalStockIn = movements
.filter((movement) => movement.movement_type === "IN")
.reduce((total, movement) => total + movement.quantity, 0);

const totalStockOut = movements
.filter((movement) => movement.movement_type === "OUT")
.reduce((total, movement) => total + movement.quantity, 0);

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setError("");
setSuccess("");

const parsedProductId = Number(productId);
const parsedQuantity = Number(quantity);

if (!Number.isSafeInteger(parsedProductId) || parsedProductId <= 0) {
  setError("Please select a valid product.");
  return;
}

if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity <= 0) {
  setError("Quantity must be a positive whole number.");
  return;
}

if (
  movementType === "OUT" &&
  selectedProduct &&
  parsedQuantity > selectedProduct.quantity
) {
  setError(
    `Insufficient stock. Available quantity: ${selectedProduct.quantity}.`
  );
  return;
}

setSubmitting(true);

try {
  const result = await createStockMovement({
    product_id: parsedProductId,
    movement_type: movementType,
    quantity: parsedQuantity,
    reference_note: referenceNote.trim() || undefined,
  });

  setSuccess(
    `Stock ${movementType === "IN" ? "received" : "released"} successfully. Remaining quantity: ${result.remaining_quantity}.`
  );

  setQuantity("1");
  setReferenceNote("");

  await loadData();
} catch (err) {
  setError(
    err instanceof Error ? err.message : "Unable to record stock movement."
  );
} finally {
  setSubmitting(false);
}

}

return ( <section className="stock-movements-page"> <header className="sm-page-header"> <div> <span className="sm-eyebrow">INVENTORY OPERATIONS</span> <h1>Stock Movements</h1> <p>Track incoming stock, outgoing stock, and inventory activity.</p> </div>

    <button
      className="sm-refresh-button"
      type="button"
      onClick={() => void loadData()}
      disabled={loading}
    >
      <RefreshCw size={16} className={loading ? "sm-spinning" : ""} />
      Refresh
    </button>
  </header>

  {error && (
    <div className="sm-alert sm-alert-error" role="alert">
      {error}
    </div>
  )}

  {success && (
    <div className="sm-alert sm-alert-success" role="status">
      {success}
    </div>
  )}

  <div className="sm-summary-grid">
    <article className="sm-summary-card">
      <div className="sm-summary-icon sm-icon-neutral">
        <History size={20} />
      </div>
      <div>
        <span>Total Movements</span>
        <strong>{movements.length}</strong>
      </div>
    </article>

    <article className="sm-summary-card">
      <div className="sm-summary-icon sm-icon-in">
        <ArrowDownToLine size={20} />
      </div>
      <div>
        <span>Total Stock In</span>
        <strong>{totalStockIn.toLocaleString()}</strong>
        <small>Units recorded</small>
      </div>
    </article>

    <article className="sm-summary-card">
      <div className="sm-summary-icon sm-icon-out">
        <ArrowUpFromLine size={20} />
      </div>
      <div>
        <span>Total Stock Out</span>
        <strong>{totalStockOut.toLocaleString()}</strong>
        <small>Units recorded</small>
      </div>
    </article>
  </div>

  {canManageStock && (
    <form className="sm-form-card" onSubmit={handleSubmit}>
      <div className="sm-section-heading">
        <div className="sm-heading-icon">
          <Package size={20} />
        </div>
        <div>
          <h2>Record Stock Movement</h2>
          <p>Update inventory by receiving or releasing stock.</p>
        </div>
      </div>

      <div className="sm-movement-toggle">
        <button
          type="button"
          className={movementType === "IN" ? "active sm-toggle-in" : ""}
          onClick={() => setMovementType("IN")}
          aria-pressed={movementType === "IN"}
        >
          <ArrowDownToLine size={17} />
          Stock In
        </button>

        <button
          type="button"
          className={movementType === "OUT" ? "active sm-toggle-out" : ""}
          onClick={() => setMovementType("OUT")}
          aria-pressed={movementType === "OUT"}
        >
          <ArrowUpFromLine size={17} />
          Stock Out
        </button>
      </div>

      <div className="sm-form-grid">
        <label className="sm-field">
          <span>Product *</span>
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
            disabled={products.length === 0}
          >
            <option value="" disabled>
              Select a product
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku}) — Available: {product.quantity}
              </option>
            ))}
          </select>
        </label>

        <label className="sm-field">
          <span>Quantity *</span>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </label>

        <label className="sm-field sm-field-full">
          <span>Reference Note</span>
          <input
            type="text"
            maxLength={255}
            value={referenceNote}
            onChange={(event) => setReferenceNote(event.target.value)}
            placeholder="e.g. Purchase order #PO-1001"
          />
        </label>
      </div>

      {selectedProduct && (
        <p className="sm-available-stock">
          Current available stock: <strong>{selectedProduct.quantity}</strong>
          {movementType === "OUT" && (
            <span> · Maximum quantity: {selectedProduct.quantity}</span>
          )}
        </p>
      )}

      <div className="sm-form-footer">
        <p>* Required fields</p>
        <button
          type="submit"
          className="sm-submit-button"
          disabled={submitting || products.length === 0}
        >
          {submitting
            ? "Recording..."
            : `Record Stock ${movementType === "IN" ? "In" : "Out"}`}
        </button>
      </div>
    </form>
  )}

  <section className="sm-history-card">
    <div className="sm-history-header">
      <div>
        <h2>Movement History</h2>
        <p>Review all recorded stock transactions.</p>
      </div>

      <label className="sm-search">
        <Search size={17} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search movements..."
        />
      </label>
    </div>

    <div className="sm-table-wrapper">
      <table className="sm-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Movement</th>
            <th>Quantity</th>
            <th>Reference</th>
            <th>Date &amp; Time</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="sm-table-message">
                Loading stock movements...
              </td>
            </tr>
          ) : filteredMovements.length === 0 ? (
            <tr>
              <td colSpan={6} className="sm-table-message">
                No stock movements found.
              </td>
            </tr>
          ) : (
            filteredMovements.map((movement) => (
              <tr key={movement.id}>
                <td className="sm-product-name">{movement.product_name}</td>
                <td>{movement.sku}</td>
                <td>
                  <span
                    className={`sm-movement-badge sm-badge-${movement.movement_type.toLowerCase()}`}
                  >
                    {movement.movement_type}
                  </span>
                </td>
                <td
                  className={
                    movement.movement_type === "IN"
                      ? "sm-quantity-in"
                      : movement.movement_type === "OUT"
                        ? "sm-quantity-out"
                        : ""
                  }
                >
                  {movement.movement_type === "IN" ? "+" : ""}
                  {movement.quantity}
                </td>
                <td>{movement.reference_note || "—"}</td>
                <td>
                  {new Date(movement.created_at).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    <footer className="sm-table-footer">
      Showing {filteredMovements.length} of {movements.length} movements
    </footer>
  </section>
</section>

);
}
