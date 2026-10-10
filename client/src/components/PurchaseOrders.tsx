
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  RefreshCw,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  X,
  Trash2,
  LoaderCircle,
  AlertCircle,
  PackageCheck,
  Ban,
  Send,
  Pencil,
} from "lucide-react";

import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
  type ReceivedPurchaseOrderItem,
} from "../services/purchaseOrderService";

import {
  getSuppliers,
  type Supplier,
} from "../services/supplierService";

import {
  getProducts,
  type Product,
} from "../services/productService";

import "./PurchaseOrders.css";

const STATUS_OPTIONS: {
  label: string;
  value: "ALL" | PurchaseOrderStatus;
}[] = [
  { label: "All Statuses", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Ordered", value: "ORDERED" },
  { label: "Partially Received", value: "PARTIALLY_RECEIVED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Cancelled", value: "CANCELLED" },
];

interface OrderFormItem {
  product_id: string;
  quantity_ordered: string;
  unit_cost: string;
}

type PurchaseOrderWithItems = PurchaseOrder & {
  items: PurchaseOrderItem[];
};

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyItem(): OrderFormItem {
  return {
    product_id: "",
    quantity_ordered: "1",
    unit_cost: "",
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatStatus(status: PurchaseOrderStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

interface PurchaseOrdersProps {
  canManagePurchaseOrders: boolean;
}

function PurchaseOrders({
  canManagePurchaseOrders,
}: PurchaseOrdersProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | PurchaseOrderStatus>("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<PurchaseOrderWithItems | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(getToday());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const [formItems, setFormItems] = useState<OrderFormItem[]>([
    createEmptyItem(),
  ]);

  const [formError, setFormError] = useState("");

  // Receive-stock modal state
  const [receivingOrder, setReceivingOrder] =
    useState<PurchaseOrderWithItems | null>(null);

  const [receiveQuantities, setReceiveQuantities] = useState<
    Record<number, string>
  >({});

  const [receiveError, setReceiveError] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    setError("");

    try {
      const [orderData, supplierData, productData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProducts(),
      ]);

      setOrders(orderData);
      setSuppliers(supplierData);
      setProducts(productData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase order data."
      );
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

useEffect(() => {
  let cancelled = false;

  const timerId = window.setTimeout(() => {
    if (!cancelled) {
      void loadData();
    }
  }, 0);

  return () => {
    cancelled = true;
    window.clearTimeout(timerId);
  };
}, [loadData]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.po_number.toLowerCase().includes(query) ||
        (order.supplier_name ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) =>
      order.status === "ORDERED" ||
      order.status === "PARTIALLY_RECEIVED"
  ).length;

  const receivedOrders = orders.filter(
    (order) => order.status === "RECEIVED"
  ).length;

  const totalValue = orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce(
      (total, order) => total + Number(order.total_amount || 0),
      0
    );

  const formTotal = formItems.reduce((total, item) => {
    const quantity = Number(item.quantity_ordered) || 0;
    const unitCost = Number(item.unit_cost) || 0;

    return total + quantity * unitCost;
  }, 0);

  function resetForm() {
    setSupplierId("");
    setOrderDate(getToday());
    setExpectedDeliveryDate("");
    setNotes("");
    setFormItems([createEmptyItem()]);
    setFormError("");
  }

  function openCreateModal() {
    resetForm();
    setEditingOrder(null);
    setError("");
    setSuccessMessage("");
    setIsCreateModalOpen(true);
  }

  async function openEditModal(order: PurchaseOrder) {
    if (actionOrderId !== null) return;

    setActionOrderId(order.id);
    setError("");
    setSuccessMessage("");

    try {
      const details = await getPurchaseOrderById(order.id);

      if (details.status !== "DRAFT") {
        throw new Error("Only draft purchase orders can be edited.");
      }

      if (!details.items || details.items.length === 0) {
        throw new Error("This purchase order does not contain any items.");
      }

      setEditingOrder(details as PurchaseOrderWithItems);
      setSupplierId(String(details.supplier_id));
      setOrderDate(details.order_date.slice(0, 10));
      setExpectedDeliveryDate(
        details.expected_delivery_date?.slice(0, 10) ?? ""
      );
      setNotes(details.notes ?? "");
      setFormItems(
        details.items.map((item) => ({
          product_id: String(item.product_id),
          quantity_ordered: String(item.quantity_ordered),
          unit_cost: String(item.unit_cost),
        }))
      );
      setFormError("");
      setIsCreateModalOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase order details."
      );
    } finally {
      setActionOrderId(null);
    }
  }

  function closeCreateModal() {
    if (isSaving) return;

    setIsCreateModalOpen(false);
    setEditingOrder(null);
    setFormError("");
  }

  function updateFormItem(
    index: number,
    field: keyof OrderFormItem,
    value: string
  ) {
    setFormItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function handleProductChange(index: number, productId: string) {
    const product = products.find(
      (item) => String(item.id) === productId
    );

    setFormItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              product_id: productId,
              unit_cost:
                product && item.unit_cost === ""
                  ? String(product.unit_price)
                  : item.unit_cost,
            }
          : item
      )
    );
  }

  function addFormItem() {
    setFormItems((current) => [...current, createEmptyItem()]);
  }

  function removeFormItem(index: number) {
    setFormItems((current) =>
      current.length === 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function handleCreatePurchaseOrder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setFormError("");
    setError("");
    setSuccessMessage("");

    if (!supplierId) {
      setFormError("Please select a supplier.");
      return;
    }

    if (
      expectedDeliveryDate &&
      expectedDeliveryDate < orderDate
    ) {
      setFormError(
        "Expected delivery date cannot be earlier than the order date."
      );
      return;
    }

    if (formItems.some((item) => !item.product_id)) {
      setFormError("Please select a product for every order item.");
      return;
    }

    const productIds = formItems.map((item) => item.product_id);

    if (new Set(productIds).size !== productIds.length) {
      setFormError(
        "Each product can appear only once. Update its quantity instead."
      );
      return;
    }

    for (const item of formItems) {
      const quantity = Number(item.quantity_ordered);
      const unitCost = Number(item.unit_cost);

      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        setFormError(
          "Each item must have a positive whole-number quantity."
        );
        return;
      }

      if (
        item.unit_cost.trim() === "" ||
        !Number.isFinite(unitCost) ||
        unitCost < 0 ||
        unitCost > 9999999999.99
      ) {
        setFormError(
          "Enter a valid, non-negative unit cost for every item."
        );
        return;
      }
    }

    const input: PurchaseOrderInput = {
      supplier_id: Number(supplierId),
      order_date: orderDate,
      expected_delivery_date: expectedDeliveryDate || null,
      notes: notes.trim() || null,
      items: formItems.map((item) => ({
        product_id: Number(item.product_id),
        quantity_ordered: Number(item.quantity_ordered),
        unit_cost: Math.round(Number(item.unit_cost) * 100) / 100,
      })),
    };

    setIsSaving(true);

    try {
      if (editingOrder) {
        await updatePurchaseOrder(editingOrder.id, input);
        setIsCreateModalOpen(false);
        resetForm();
        setEditingOrder(null);
        setSuccessMessage(
          `Purchase order ${editingOrder.po_number} was updated successfully.`
        );
      } else {
        const created = await createPurchaseOrder(input);

        setIsCreateModalOpen(false);
        resetForm();
        setSuccessMessage(
          `Purchase order ${created.po_number} was created successfully.`
        );
      }

      await loadData(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to create the purchase order."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(
    order: PurchaseOrder,
    status: "ORDERED" | "CANCELLED"
  ) {
    if (actionOrderId !== null) return;

    if (
      status === "CANCELLED" &&
      !window.confirm(
        `Are you sure you want to cancel purchase order ${order.po_number}?`
      )
    ) {
      return;
    }

    setActionOrderId(order.id);
    setError("");
    setSuccessMessage("");

    try {
      await updatePurchaseOrderStatus(order.id, status);

      setSuccessMessage(
        status === "ORDERED"
          ? `Purchase order ${order.po_number} marked as ordered.`
          : `Purchase order ${order.po_number} cancelled.`
      );

      await loadData(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the purchase order status."
      );
    } finally {
      setActionOrderId(null);
    }
  }

  async function openReceiveModal(order: PurchaseOrder) {
    if (actionOrderId !== null || isReceiving) return;

    setActionOrderId(order.id);
    setError("");
    setSuccessMessage("");
    setReceiveError("");

    try {
      const details = await getPurchaseOrderById(order.id);

      if (!details.items || details.items.length === 0) {
        throw new Error(
          "This purchase order does not contain any items."
        );
      }

      if (
        details.status !== "ORDERED" &&
        details.status !== "PARTIALLY_RECEIVED"
      ) {
        throw new Error(
          "Only ordered or partially received orders can receive stock."
        );
      }

      setReceivingOrder(
        details as PurchaseOrderWithItems
      );

      setReceiveQuantities(
        Object.fromEntries(
          details.items.map((item) => [
            item.id,
            "",
          ])
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase order details."
      );
    } finally {
      setActionOrderId(null);
    }
  }

  function closeReceiveModal() {
    if (isReceiving) return;

    setReceivingOrder(null);
    setReceiveQuantities({});
    setReceiveError("");
  }

  function updateReceiveQuantity(
    itemId: number,
    value: string
  ) {
    setReceiveQuantities((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  async function handleReceiveStock(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setReceiveError("");
    setError("");
    setSuccessMessage("");

    if (!receivingOrder) return;

    const items: ReceivedPurchaseOrderItem[] = [];

    for (const item of receivingOrder.items) {
      const rawQuantity = receiveQuantities[item.id]?.trim() ?? "";

      // Empty inputs mean no quantity is being received for this item.
      if (rawQuantity === "") continue;

      const quantity = Number(rawQuantity);
      const remaining =
        Number(item.quantity_ordered) - Number(item.quantity_received);

      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        setReceiveError(
          `Enter a positive whole-number quantity for ${item.product_name}, or leave it blank.`
        );
        return;
      }

      if (quantity > remaining) {
        setReceiveError(
          `The quantity for ${item.product_name} cannot exceed the remaining quantity of ${remaining}.`
        );
        return;
      }

      items.push({
        item_id: item.id,
        quantity,
      });
    }

    if (items.length === 0) {
      setReceiveError(
        "Enter a quantity for at least one item before receiving stock."
      );
      return;
    }

    setIsReceiving(true);

    try {
      const result = await receivePurchaseOrder(
        receivingOrder.id,
        items
      );

      const orderNumber = receivingOrder.po_number;

      setReceivingOrder(null);
      setReceiveQuantities({});

      setSuccessMessage(
        result.status === "RECEIVED"
          ? `Purchase order ${orderNumber} has been fully received. Inventory and stock movement history have been updated.`
          : `Stock received for ${orderNumber}. The purchase order remains partially received.`
      );

      await loadData(false);
    } catch (err) {
      setReceiveError(
        err instanceof Error
          ? err.message
          : "Unable to receive stock for this purchase order."
      );
    } finally {
      setIsReceiving(false);
    }
  }

  return (
    <div className="purchase-orders-page">
      <section className="po-page-heading">
        <div className="po-heading-copy">
          <div className="po-eyebrow">
            <ClipboardList size={15} />
            PROCUREMENT MANAGEMENT
          </div>

          <h1>Purchase Orders</h1>

          <p>
            Create supplier orders, monitor deliveries, and manage incoming
            warehouse inventory.
          </p>
        </div>

        {canManagePurchaseOrders && (
          <button
            type="button"
            className="po-primary-button"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            Create Purchase Order
          </button>
        )}
      </section>

      {error && (
        <div className="po-alert po-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            className="po-icon-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="po-alert po-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
          <button
            type="button"
            className="po-icon-button"
            aria-label="Dismiss success message"
            onClick={() => setSuccessMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="po-stats-grid">
        <article className="po-stat-card">
          <div className="po-stat-icon po-icon-blue">
            <ShoppingCart size={21} />
          </div>
          <div>
            <span>Total Orders</span>
            <strong>{totalOrders}</strong>
            <small>All purchase orders</small>
          </div>
        </article>

        <article className="po-stat-card">
          <div className="po-stat-icon po-icon-orange">
            <Clock size={21} />
          </div>
          <div>
            <span>Awaiting Delivery</span>
            <strong>{pendingOrders}</strong>
            <small>Ordered or partially received</small>
          </div>
        </article>

        <article className="po-stat-card">
          <div className="po-stat-icon po-icon-green">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Received Orders</span>
            <strong>{receivedOrders}</strong>
            <small>Fully received orders</small>
          </div>
        </article>

        <article className="po-stat-card">
          <div className="po-stat-icon po-icon-purple">
            <Truck size={21} />
          </div>
          <div>
            <span>Order Value</span>
            <strong>{formatCurrency(totalValue)}</strong>
            <small>Excluding cancelled orders</small>
          </div>
        </article>
      </section>

      <section className="po-table-panel">
        <div className="po-table-heading">
          <div>
            <h2>All Purchase Orders</h2>
            <p>Track and manage your supplier orders.</p>
          </div>

          <button
            type="button"
            className="po-icon-button"
            title="Refresh purchase orders"
            aria-label="Refresh purchase orders"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            <RefreshCw
              size={17}
              className={isLoading ? "po-spin" : ""}
            />
          </button>
        </div>

        <div className="po-toolbar">
          <label className="po-search">
            <Search size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search PO number or supplier..."
              aria-label="Search purchase orders"
            />
          </label>

          <select
            className="po-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "ALL" | PurchaseOrderStatus
              )
            }
            aria-label="Filter purchase orders by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="po-table-wrapper">
          <table className="po-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Expected Delivery</th>
                <th>Total Amount</th>
                <th>Status</th>
                {canManagePurchaseOrders && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canManagePurchaseOrders ? 7 : 6}>
                    <div className="po-loading-state">
                      <LoaderCircle size={25} className="po-spin" />
                      <span>Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isActing = actionOrderId === order.id;

                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.po_number}</strong>
                      </td>
                      <td>{order.supplier_name}</td>
                      <td>{formatDate(order.order_date)}</td>
                      <td>{formatDate(order.expected_delivery_date)}</td>
                      <td className="po-amount">
                        {formatCurrency(Number(order.total_amount))}
                      </td>
                      <td>
                        <span
                          className={`po-status-badge po-status-${order.status.toLowerCase()}`}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </td>

                      {canManagePurchaseOrders && (
                        <td>
                          <div className="po-actions">
                            {order.status === "DRAFT" && (
                              <>
                                <button
                                  type="button"
                                  className="po-action-button po-action-edit"
                                  title="Edit draft purchase order"
                                  disabled={actionOrderId !== null}
                                  onClick={() => void openEditModal(order)}
                                >
                                  {isActing ? (
                                    <LoaderCircle size={15} className="po-spin" />
                                  ) : (
                                    <Pencil size={15} />
                                  )}
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="po-action-button po-action-order"
                                  title="Mark this order as ordered"
                                  disabled={actionOrderId !== null}
                                  onClick={() =>
                                    void handleStatusChange(order, "ORDERED")
                                  }
                                >
                                  {isActing ? (
                                    <LoaderCircle
                                      size={15}
                                      className="po-spin"
                                    />
                                  ) : (
                                    <Send size={15} />
                                  )}
                                  Order
                                </button>

                                <button
                                  type="button"
                                  className="po-action-button po-action-cancel"
                                  title="Cancel purchase order"
                                  disabled={actionOrderId !== null}
                                  onClick={() =>
                                    void handleStatusChange(order, "CANCELLED")
                                  }
                                >
                                  <Ban size={15} />
                                  Cancel
                                </button>
                              </>
                            )}

                            {order.status === "ORDERED" && (
                              <>
                                <button
                                  type="button"
                                  className="po-action-button po-action-receive"
                                  disabled={actionOrderId !== null}
                                  onClick={() =>
                                    void openReceiveModal(order)
                                  }
                                >
                                  {isActing ? (
                                    <LoaderCircle
                                      size={15}
                                      className="po-spin"
                                    />
                                  ) : (
                                    <PackageCheck size={15} />
                                  )}
                                  Receive
                                </button>

                                <button
                                  type="button"
                                  className="po-action-button po-action-cancel"
                                  disabled={actionOrderId !== null}
                                  onClick={() =>
                                    void handleStatusChange(order, "CANCELLED")
                                  }
                                >
                                  <Ban size={15} />
                                  Cancel
                                </button>
                              </>
                            )}

                            {order.status === "PARTIALLY_RECEIVED" && (
                              <button
                                type="button"
                                className="po-action-button po-action-receive"
                                disabled={actionOrderId !== null}
                                onClick={() =>
                                  void openReceiveModal(order)
                                }
                              >
                                {isActing ? (
                                  <LoaderCircle
                                    size={15}
                                    className="po-spin"
                                  />
                                ) : (
                                  <PackageCheck size={15} />
                                )}
                                Receive
                              </button>
                            )}

                            {(order.status === "RECEIVED" ||
                              order.status === "CANCELLED") && (
                              <span className="po-no-actions">—</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canManagePurchaseOrders ? 7 : 6}>
                    <div className="po-empty-state">
                      <div className="po-empty-icon">
                        <ClipboardList size={27} />
                      </div>

                      <h3>
                        {searchQuery || statusFilter !== "ALL"
                          ? "No matching purchase orders"
                          : "No purchase orders yet"}
                      </h3>

                      <p>
                        {searchQuery || statusFilter !== "ALL"
                          ? "Try changing your search or status filter."
                          : "Create a purchase order to start tracking supplier deliveries."}
                      </p>

                      {!searchQuery &&
                        statusFilter === "ALL" &&
                        canManagePurchaseOrders && (
                          <button
                            type="button"
                            className="po-primary-button"
                            onClick={openCreateModal}
                            disabled={
                              suppliers.length === 0 || products.length === 0
                            }
                          >
                            <Plus size={17} />
                            Create First Order
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="po-table-footer">
          Showing {filteredOrders.length} of {totalOrders} orders
        </div>
      </section>

      {/* Create Purchase Order Modal */}
      {isCreateModalOpen && (
        <div
          className="po-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <section
            className="po-modal po-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="po-modal-title"
          >
            <header className="po-modal-header">
              <div>
                <h2 id="po-modal-title">
                  {editingOrder ? "Edit Purchase Order" : "Create Purchase Order"}
                </h2>
                <p>
                  {editingOrder
                    ? `Update draft ${editingOrder.po_number} before it is ordered.`
                    : "Set up a new order from your supplier."}
                </p>
              </div>

              <button
                type="button"
                className="po-icon-button"
                aria-label="Close dialog"
                onClick={closeCreateModal}
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleCreatePurchaseOrder}>
              <div className="po-modal-body">
                {formError && (
                  <div className="po-alert po-alert-error" role="alert">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {suppliers.length === 0 || products.length === 0 ? (
                  <div className="po-alert po-alert-error" role="alert">
                    <AlertCircle size={18} />
                    <span>
                      {suppliers.length === 0 && products.length === 0
                        ? "Add at least one supplier and one product before creating a purchase order."
                        : suppliers.length === 0
                          ? "Add a supplier before creating a purchase order."
                          : "Add a product before creating a purchase order."}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="po-form-grid">
                      <label className="po-form-field">
                        <span>Supplier <b>*</b></span>
                        <select
                          value={supplierId}
                          onChange={(event) =>
                            setSupplierId(event.target.value)
                          }
                          required
                          disabled={isSaving}
                        >
                          <option value="">Select a supplier</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="po-form-field">
                        <span>Order Date <b>*</b></span>
                        <input
                          type="date"
                          value={orderDate}
                          onChange={(event) =>
                            setOrderDate(event.target.value)
                          }
                          required
                          disabled={isSaving}
                        />
                      </label>

                      <label className="po-form-field">
                        <span>Expected Delivery</span>
                        <input
                          type="date"
                          value={expectedDeliveryDate}
                          min={orderDate}
                          onChange={(event) =>
                            setExpectedDeliveryDate(event.target.value)
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="po-form-field po-notes-field">
                        <span>Notes</span>
                        <textarea
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          maxLength={10000}
                          rows={3}
                          placeholder="Optional order notes..."
                          disabled={isSaving}
                        />
                      </label>
                    </div>

                    <div className="po-items-heading">
                      <div>
                        <h3>Order Items</h3>
                        <p>Select the products and quantities to order.</p>
                      </div>

                      <button
                        type="button"
                        className="po-secondary-button"
                        onClick={addFormItem}
                        disabled={isSaving}
                      >
                        <Plus size={16} />
                        Add Item
                      </button>
                    </div>

                    <div className="po-form-items">
                      {formItems.map((item, index) => {
                        const selectedProduct = products.find(
                          (product) => String(product.id) === item.product_id
                        );

                        const lineTotal =
                          (Number(item.quantity_ordered) || 0) *
                          (Number(item.unit_cost) || 0);

                        return (
                          <div className="po-form-item" key={index}>
                            <div className="po-form-item-top">
                              <strong>Item {index + 1}</strong>

                              <button
                                type="button"
                                className="po-remove-item"
                                aria-label={`Remove item ${index + 1}`}
                                onClick={() => removeFormItem(index)}
                                disabled={isSaving || formItems.length === 1}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <label className="po-form-field">
                              <span>Product <b>*</b></span>
                              <select
                                value={item.product_id}
                                onChange={(event) =>
                                  handleProductChange(
                                    index,
                                    event.target.value
                                  )
                                }
                                required
                                disabled={isSaving}
                              >
                                <option value="">Select a product</option>

                                {products.map((product) => {
                                  const usedElsewhere = formItems.some(
                                    (otherItem, otherIndex) =>
                                      otherIndex !== index &&
                                      otherItem.product_id === String(product.id)
                                  );

                                  return (
                                    <option
                                      key={product.id}
                                      value={product.id}
                                      disabled={usedElsewhere}
                                    >
                                      {product.sku} — {product.name}
                                    </option>
                                  );
                                })}
                              </select>

                              {selectedProduct && (
                                <small>
                                  Current stock: {selectedProduct.quantity}
                                </small>
                              )}
                            </label>

                            <div className="po-item-fields-grid">
                              <label className="po-form-field">
                                <span>Quantity <b>*</b></span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.quantity_ordered}
                                  onChange={(event) =>
                                    updateFormItem(
                                      index,
                                      "quantity_ordered",
                                      event.target.value
                                    )
                                  }
                                  required
                                  disabled={isSaving}
                                />
                              </label>

                              <label className="po-form-field">
                                <span>Unit Cost (PHP) <b>*</b></span>
                                <input
                                  type="number"
                                  min="0"
                                  max="9999999999.99"
                                  step="0.01"
                                  value={item.unit_cost}
                                  onChange={(event) =>
                                    updateFormItem(
                                      index,
                                      "unit_cost",
                                      event.target.value
                                    )
                                  }
                                  required
                                  disabled={isSaving}
                                />
                              </label>

                              <div className="po-line-total">
                                <span>Line Total</span>
                                <strong>{formatCurrency(lineTotal)}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="po-form-total">
                      <span>Estimated Order Total</span>
                      <strong>{formatCurrency(formTotal)}</strong>
                    </div>
                  </>
                )}
              </div>

              <footer className="po-modal-footer">
                <button
                  type="button"
                  className="po-secondary-button"
                  onClick={closeCreateModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="po-primary-button"
                  disabled={
                    isSaving ||
                    suppliers.length === 0 ||
                    products.length === 0
                  }
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle size={17} className="po-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingOrder ? "Save Changes" : "Create Draft Order"}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Receive Stock Modal */}
      {receivingOrder && (
        <div
          className="po-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReceiveModal();
            }
          }}
        >
          <section
            className="po-modal po-receive-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="po-receive-title"
          >
            <header className="po-modal-header">
              <div>
                <h2 id="po-receive-title">Receive Stock</h2>
                <p>
                  {receivingOrder.po_number} · {receivingOrder.supplier_name}
                </p>
              </div>

              <button
                type="button"
                className="po-icon-button"
                aria-label="Close receiving dialog"
                onClick={closeReceiveModal}
                disabled={isReceiving}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleReceiveStock}>
              <div className="po-modal-body">
                <div className="po-receive-notice">
                  <PackageCheck size={19} />
                  <p>
                    Enter the quantities delivered in this shipment. Leave an
                    item blank if none of it arrived. Only the quantities
                    entered here will be added to inventory.
                  </p>
                </div>

                {receiveError && (
                  <div className="po-alert po-alert-error" role="alert">
                    <AlertCircle size={18} />
                    <span>{receiveError}</span>
                  </div>
                )}

                <div className="po-receive-items">
                  {receivingOrder.items.map((item) => {
                    const ordered = Number(item.quantity_ordered);
                    const previouslyReceived = Number(item.quantity_received);
                    const remaining = ordered - previouslyReceived;

                    return (
                      <div className="po-receive-item" key={item.id}>
                        <div className="po-receive-item-heading">
                          <div>
                            <strong>{item.product_name}</strong>
                            <small>{item.sku}</small>
                          </div>

                          <span className="po-receive-remaining">
                            {remaining} remaining
                          </span>
                        </div>

                        <div className="po-receive-quantity-grid">
                          <div>
                            <span>Ordered</span>
                            <strong>{ordered}</strong>
                          </div>

                          <div>
                            <span>Received</span>
                            <strong>{previouslyReceived}</strong>
                          </div>

                          <label className="po-form-field">
                            <span>Receive Now</span>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              step="1"
                              value={receiveQuantities[item.id] ?? ""}
                              onChange={(event) =>
                                updateReceiveQuantity(
                                  item.id,
                                  event.target.value
                                )
                              }
                              placeholder="0"
                              disabled={isReceiving || remaining <= 0}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <footer className="po-modal-footer">
                <button
                  type="button"
                  className="po-secondary-button"
                  onClick={closeReceiveModal}
                  disabled={isReceiving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="po-primary-button"
                  disabled={isReceiving}
                >
                  {isReceiving ? (
                    <>
                      <LoaderCircle size={17} className="po-spin" />
                      Receiving...
                    </>
                  ) : (
                    <>
                      <PackageCheck size={17} />
                      Confirm Received Stock
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;
