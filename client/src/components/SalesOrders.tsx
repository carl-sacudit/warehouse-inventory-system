import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import {
  getProducts,
  type Product,
} from "../services/productService";
import {
  createSalesOrder,
  getSalesOrders,
  type SalesOrder,
  type SalesOrderInput,
} from "../services/salesOrderService";
import { useToast } from "./ToastProvider.tsx";
import ProductThumbnail from "./ProductThumbnail.tsx";
import "./SalesOrders.css";

interface SaleFormItem {
  product_id: string;
  quantity: string;
  unit_selling_price: string;
}

function emptyItem(): SaleFormItem {
  return { product_id: "", quantity: "1", unit_selling_price: "" };
}

function money(value: number | string): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function dateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SalesOrders() {
  const notify = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<SaleFormItem[]>([emptyItem()]);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [orderResult, productResult] = await Promise.allSettled([
        getSalesOrders(),
        getProducts(),
      ]);

      const errors: string[] = [];
      if (orderResult.status === "fulfilled") {
        setOrders(orderResult.value);
      } else {
        errors.push(
          orderResult.reason instanceof Error
            ? orderResult.reason.message
            : "Unable to load sales history."
        );
      }

      if (productResult.status === "fulfilled") {
        setProducts(productResult.value);
      } else {
        errors.push(
          productResult.reason instanceof Error
            ? productResult.reason.message
            : "Unable to load products."
        );
      }

      if (errors.length) notify("error", errors.join(" "));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    const timerId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      order.sale_number.toLowerCase().includes(query) ||
      (order.customer_name ?? "").toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const totalRevenue = orders.reduce(
    (total, order) => total + Number(order.total_revenue), 0
  );
  const totalCost = orders.reduce(
    (total, order) => total + Number(order.total_cost), 0
  );
  const grossProfit = orders.reduce(
    (total, order) => total + Number(order.gross_profit), 0
  );

  const formTotal = items.reduce((total, item) => {
    return total + Number(item.quantity || 0) * Number(item.unit_selling_price || 0);
  }, 0);

  function resetForm() {
    setCustomerName("");
    setItems([emptyItem()]);
    setFormError("");
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  }

  function updateItem(index: number, field: keyof SaleFormItem, value: string) {
    setItems((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((candidate) => String(candidate.id) === productId);
    setItems((current) => current.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            product_id: productId,
            unit_selling_price: product ? String(product.selling_price) : "",
          }
        : item
    ));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (items.some((item) => !item.product_id)) {
      setFormError("Select a product for every sale item.");
      return;
    }

    if (new Set(items.map((item) => item.product_id)).size !== items.length) {
      setFormError("Each product can appear only once. Update its quantity instead.");
      return;
    }

    for (const item of items) {
      const product = products.find((candidate) => String(candidate.id) === item.product_id);
      const quantity = Number(item.quantity);
      const unitSellingPrice = Number(item.unit_selling_price);
      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        setFormError("Sale quantities must be positive whole numbers.");
        return;
      }
      if (
        item.unit_selling_price.trim() === "" ||
        !Number.isFinite(unitSellingPrice) ||
        unitSellingPrice < 0 ||
        unitSellingPrice > 9999999999.99
      ) {
        setFormError("Enter a valid, non-negative price charged for every item.");
        return;
      }
      if (product && quantity > Number(product.quantity)) {
        setFormError(`Insufficient stock for ${product.name}. Available: ${product.quantity}.`);
        return;
      }
    }

    const input: SalesOrderInput = {
      customer_name: customerName.trim() || null,
      items: items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        unit_selling_price: Math.round(Number(item.unit_selling_price) * 100) / 100,
      })),
    };

    setSaving(true);
    try {
      const result = await createSalesOrder(input);
      notify(
        "success",
        `Sale ${result.sale_number} recorded. Gross profit: ${money(result.gross_profit)}.`
      );
      setModalOpen(false);
      resetForm();
      await loadData(true);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Unable to record sale.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sales-page">
      <header className="sales-page-heading">
        <div>
          <span className="sales-eyebrow">RETAIL OPERATIONS</span>
          <h1>Sales Orders</h1>
          <p>Record completed sales and track revenue, cost, and gross profit.</p>
        </div>
        <div className="sales-heading-actions">
          <button
            type="button"
            className="sales-refresh-button"
            aria-label="Refresh sales"
            title="Refresh sales"
            onClick={() => void loadData(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "sales-spin" : ""} />
          </button>
          <button
            type="button"
            className="sales-primary-button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
          >
            <Plus size={17} /> Record sale
          </button>
        </div>
      </header>

      <div className="sales-summary-grid">
        <article><span className="sales-summary-icon sales-summary-teal"><ShoppingBag size={18} /></span><div><span>Completed sales</span><strong>{loading ? "—" : orders.length}</strong></div></article>
        <article><span className="sales-summary-icon sales-summary-blue"><CircleDollarSign size={18} /></span><div><span>Revenue</span><strong>{loading ? "—" : money(totalRevenue)}</strong></div></article>
        <article><span className="sales-summary-icon sales-summary-amber"><ArrowDownToLine size={18} /></span><div><span>Cost of goods</span><strong>{loading ? "—" : money(totalCost)}</strong></div></article>
        <article><span className="sales-summary-icon sales-summary-green"><CheckCircle2 size={18} /></span><div><span>Gross profit</span><strong>{loading ? "—" : money(grossProfit)}</strong></div></article>
      </div>

      <section className="sales-panel">
        <div className="sales-panel-heading">
          <div><h2>Sales history</h2><p>Each completed sale automatically records stock outflow.</p></div>
          <span>{filteredOrders.length} sales</span>
        </div>
        <div className="sales-toolbar">
          <label className="sales-search">
            <Search size={17} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search sale number or customer..."
              aria-label="Search sales"
            />
          </label>
          <span><ClipboardList size={15} /> Completed transactions</span>
        </div>
        <div className="sales-table-wrapper">
          <table className="sales-table">
            <thead><tr><th>Sale</th><th>Customer</th><th>Recorded</th><th>Revenue</th><th>Cost</th><th>Gross profit</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="sales-table-message"><LoaderCircle size={18} className="sales-spin" /> Loading sales...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="sales-table-message"><div className="sales-empty"><ShoppingBag size={27} /><strong>{searchQuery ? "No matching sales" : "No sales recorded yet"}</strong><span>{searchQuery ? "Try a different search." : "Record a sale to begin tracking revenue and profit."}</span></div></td></tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td><strong className="sales-number">{order.sale_number}</strong></td>
                  <td>{order.customer_name || "Walk-in customer"}</td>
                  <td>{dateTime(order.created_at)}</td>
                  <td>{money(order.total_revenue)}</td>
                  <td>{money(order.total_cost)}</td>
                  <td><strong className={Number(order.gross_profit) >= 0 ? "sales-profit-positive" : "sales-profit-negative"}>{money(order.gross_profit)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="sales-panel-footer">Gross profit is based on the weighted-average product cost at the time of sale.</footer>
      </section>

      {modalOpen && (
        <div className="sales-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section className="sales-modal" role="dialog" aria-modal="true" aria-labelledby="sales-modal-title">
            <header className="sales-modal-header">
              <div><h2 id="sales-modal-title">Record sale</h2><p>Confirm the quantities sold. Stock is deducted when the sale is saved.</p></div>
              <button type="button" aria-label="Close dialog" onClick={closeModal} disabled={saving}><X size={19} /></button>
            </header>
            <form onSubmit={handleSubmit}>
              <div className="sales-modal-body">
                {formError && <div className="sales-form-error" role="alert"><AlertCircle size={16} />{formError}</div>}
                <label className="sales-field">
                  <span>Customer name <small>Optional</small></span>
                  <input type="text" value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={150} placeholder="Walk-in customer" disabled={saving} />
                </label>
                <div className="sales-items-heading">
                  <div><strong>Sale items</strong><span>Prices use each product’s selling price.</span></div>
                  <button type="button" className="sales-secondary-button" onClick={() => setItems((current) => [...current, emptyItem()])} disabled={saving}><Plus size={15} /> Add item</button>
                </div>
                <div className="sales-items-list">
                  {items.map((item, index) => {
                    const product = products.find((candidate) => String(candidate.id) === item.product_id);
                    const quantity = Number(item.quantity) || 0;
                    const lineTotal = quantity * Number(item.unit_selling_price || 0);
                    return (
                      <div className="sales-item" key={index}>
                        <div className="sales-item-heading"><strong>Item {index + 1}</strong><button type="button" aria-label={`Remove sale item ${index + 1}`} onClick={() => setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))} disabled={saving || items.length === 1}><Trash2 size={15} /></button></div>
                        <label className="sales-field"><span>Product</span>
                          <select value={item.product_id} onChange={(event) => selectProduct(index, event.target.value)} required disabled={saving || products.length === 0}>
                            <option value="">Select an in-stock product</option>
                            {products.map((candidate) => {
                              const used = items.some((other, otherIndex) => otherIndex !== index && other.product_id === String(candidate.id));
                              return <option key={candidate.id} value={candidate.id} disabled={used || Number(candidate.quantity) <= 0}>{candidate.sku} — {candidate.name} ({candidate.quantity} available)</option>;
                            })}
                          </select>
                          <small>
                            {loading
                              ? "Loading product catalog..."
                              : products.length === 0
                                ? "No products are available in the catalog."
                                : "Products without available stock cannot be sold."}
                          </small>
                        </label>
                        {product && <div className="sales-selected-product"><ProductThumbnail imageUrl={product.image_url} className="sales-product-thumb" /><div><strong>{product.name}</strong><span>Selling Price: {money(product.selling_price)} · {product.quantity} available</span></div></div>}
                        <div className="sales-line-fields">
                          <label className="sales-field"><span>Quantity</span><input type="number" min="1" max={product?.quantity} step="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} required disabled={saving || !product} /></label>
                          <label className="sales-field"><span>Price Charged (PHP)</span><input type="number" min="0" max="9999999999.99" step="0.01" value={item.unit_selling_price} onChange={(event) => updateItem(index, "unit_selling_price", event.target.value)} required disabled={saving || !product} /></label>
                          <div className="sales-line-total"><span>Line total</span><strong>{money(lineTotal)}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="sales-form-total"><span>Sale total</span><strong>{money(formTotal)}</strong></div>
              </div>
              <footer className="sales-modal-footer">
                <button type="button" className="sales-cancel-button" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="sales-primary-button" disabled={saving || products.length === 0}>
                  {saving ? <><LoaderCircle size={16} className="sales-spin" /> Recording sale...</> : <><CheckCircle2 size={16} /> Confirm sale</>}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default SalesOrders;