
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Package,
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
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

type MovementFilter = "ALL" | "IN" | "OUT" | "ADJUSTMENT";

const PRODUCTS_API = "http://localhost:5001/api/products";
const DEFAULT_PAGE_SIZE = "10";

/**
 * Extract a calendar date in YYYY-MM-DD format.
 * MySQL DATETIME strings are handled without timezone conversion.
 */
function getLocalDateString(value: string | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Handles MySQL DATETIME, e.g. "2026-12-03 14:30:00",
  // and ISO timestamps, e.g. "2026-12-03T06:30:00.000Z".
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);

  if (match) {
    return match[1];
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function StockMovements({
  canManageStock,
}: StockMovementsProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Stock movement form state
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("IN");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [referenceNote, setReferenceNote] = useState("");

  // History filter and pagination state
  const [typeFilter, setTypeFilter] = useState<MovementFilter>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [movementData, productResponse] = await Promise.all([
        getStockMovements(),
        fetch(PRODUCTS_API, { credentials: "include" }),
      ]);

      const productResult =
        (await productResponse.json()) as ProductsResponse;

      if (!productResponse.ok || !productResult.success) {
        throw new Error("Unable to load products.");
      }

      setMovements(movementData);
      setProducts(productResult.data);

      setProductId((current) => {
        if (
          current &&
          productResult.data.some((product) => String(product.id) === current)
        ) {
          return current;
        }

        return productResult.data.length
          ? String(productResult.data[0].id)
          : "";
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load stock movements."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  const selectedProduct = products.find(
    (product) => String(product.id) === productId
  );

  // Filter first, then paginate the matching results.
  const filteredMovements = useMemo(() => {
    const term = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesSearch =
        !term ||
        movement.product_name.toLowerCase().includes(term) ||
        movement.sku.toLowerCase().includes(term) ||
        (movement.reference_note ?? "").toLowerCase().includes(term) ||
        movement.movement_type.toLowerCase().includes(term);

      const matchesType =
        typeFilter === "ALL" || movement.movement_type === typeFilter;

      const movementDate = getLocalDateString(movement.created_at);

      const matchesStartDate =
        !startDate || (movementDate !== "" && movementDate >= startDate);

      const matchesEndDate =
        !endDate || (movementDate !== "" && movementDate <= endDate);

      return (
        matchesSearch &&
        matchesType &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [movements, search, typeFilter, startDate, endDate]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovements.length / Number(pageSize))
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMovements = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * Number(pageSize);

    return filteredMovements.slice(
      startIndex,
      startIndex + Number(pageSize)
    );
  }, [filteredMovements, safeCurrentPage, pageSize]);

  const firstVisibleRow =
    filteredMovements.length === 0
      ? 0
      : (safeCurrentPage - 1) * Number(pageSize) + 1;

  const lastVisibleRow = Math.min(
    safeCurrentPage * Number(pageSize),
    filteredMovements.length
  );

  const totalStockIn = movements
    .filter((movement) => movement.movement_type === "IN")
    .reduce((total, movement) => total + Number(movement.quantity), 0);

  const totalStockOut = movements
    .filter((movement) => movement.movement_type === "OUT")
    .reduce((total, movement) => total + Number(movement.quantity), 0);

  function resetFilters() {
    setSearch("");
    setTypeFilter("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  }

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
      setCurrentPage(1);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record stock movement."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stock-movements-page">
      <header className="sm-page-header">
        <div>
          <span className="sm-eyebrow">INVENTORY OPERATIONS</span>
          <h1>Stock Movements</h1>
          <p>
            Track incoming stock, outgoing stock, and inventory activity.
          </p>
        </div>

        <button
          className="sm-refresh-button"
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "sm-spinning" : ""}
          />
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
                    {product.name} ({product.sku}) — Available:{" "}
                    {product.quantity}
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
              Current available stock:{" "}
              <strong>{selectedProduct.quantity}</strong>
              {movementType === "OUT" && (
                <span>
                  {" "}
                  · Maximum quantity: {selectedProduct.quantity}
                </span>
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
            <p>Search and filter your recorded stock transactions.</p>
          </div>

          <label className="sm-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search movements..."
            />
          </label>
        </div>

        <div className="sm-filters">
          <label className="sm-filter-field">
            <span>
              <Filter size={15} />
              Movement Type
            </span>
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as MovementFilter);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All movements</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustments</option>
            </select>
          </label>

          <label className="sm-filter-field">
            <span>
              <CalendarDays size={15} />
              From Date
            </span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <label className="sm-filter-field">
            <span>
              <CalendarDays size={15} />
              To Date
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <button
            type="button"
            className="sm-reset-filters"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
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
              ) : paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="sm-table-message">
                    No stock movements match your filters.
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="sm-product-name">
                      {movement.product_name}
                    </td>
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

        <footer className="sm-table-footer sm-pagination-footer">
          <div className="sm-pagination-info">
            Showing <strong>{firstVisibleRow}–{lastVisibleRow}</strong> of{" "}
            <strong>{filteredMovements.length}</strong> filtered movements
            <span className="sm-total-records">
              ({movements.length} total records)
            </span>
          </div>

          <div className="sm-pagination-controls">
            <label className="sm-page-size">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Rows per page"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>per page</span>
            </label>

            <span className="sm-page-indicator">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="sm-page-button"
              aria-label="Previous page"
              title="Previous page"
              disabled={safeCurrentPage <= 1 || loading}
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
              }
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              className="sm-page-button"
              aria-label="Next page"
              title="Next page"
              disabled={safeCurrentPage >= totalPages || loading}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </section>
    </section>
  );
}