
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/database.js";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface PurchaseOrderItemInput {
  product_id: number;
  quantity_ordered: number;
  unit_cost?: number;
}

export interface PurchaseOrderInput {
  supplier_id: number;
  order_date: string;
  expected_delivery_date?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemInput[];
}

interface DbRow extends RowDataPacket {
  id: number;
  status: PurchaseOrderStatus;
  po_number: string;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  incomplete: number;
}

export class PurchaseOrderError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = "PurchaseOrderError";
  }
}

function validPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function validateItems(items: PurchaseOrderItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new PurchaseOrderError(
      "A purchase order must contain at least one item."
    );
  }

  const seen = new Set<number>();

  for (const item of items) {
    if (
      !validPositiveInteger(item.product_id) ||
      !validPositiveInteger(item.quantity_ordered)
    ) {
      throw new PurchaseOrderError(
        "Each item requires a valid product and positive quantity."
      );
    }

    if (seen.has(item.product_id)) {
      throw new PurchaseOrderError(
        "Each product can appear only once per purchase order."
      );
    }

    seen.add(item.product_id);

    if (
      item.unit_cost !== undefined &&
      (!Number.isFinite(item.unit_cost) ||
        item.unit_cost < 0 ||
        item.unit_cost > 9999999999.99)
    ) {
      throw new PurchaseOrderError(
        "Each unit cost must be a valid non-negative amount."
      );
    }
  }
}

export async function listPurchaseOrders() {
  const [rows] = await pool.query(
    `SELECT
       po.id,
       po.po_number,
       po.supplier_id,
       s.name AS supplier_name,
       po.created_by,
       u.full_name AS created_by_name,
       po.status,
       po.order_date,
       po.expected_delivery_date,
       po.total_amount,
       po.notes,
       po.created_at,
       po.updated_at
     FROM purchase_orders po
     INNER JOIN suppliers s ON s.id = po.supplier_id
     INNER JOIN users u ON u.id = po.created_by
     ORDER BY po.id DESC`
  );

  return rows;
}

export async function getPurchaseOrder(id: number) {
  const [orders] = await pool.execute<DbRow[]>(
    `SELECT po.*, s.name AS supplier_name, u.full_name AS created_by_name
     FROM purchase_orders po
     INNER JOIN suppliers s ON s.id = po.supplier_id
     INNER JOIN users u ON u.id = po.created_by
     WHERE po.id = ?`,
    [id]
  );

  if (!orders.length) {
    throw new PurchaseOrderError("Purchase order not found.", 404);
  }

  const [items] = await pool.execute<RowDataPacket[]>(
    `SELECT
       poi.id,
       poi.product_id,
       p.sku,
       p.name AS product_name,
       poi.quantity_ordered,
       poi.quantity_received,
       poi.unit_cost,
       poi.line_total
     FROM purchase_order_items poi
     INNER JOIN products p ON p.id = poi.product_id
     WHERE poi.purchase_order_id = ?
     ORDER BY poi.id`,
    [id]
  );

  return { ...orders[0], items };
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
  userId: number
) {
  validateItems(input.items);

  if (!validPositiveInteger(input.supplier_id)) {
    throw new PurchaseOrderError("Please select a valid supplier.");
  }

  if (
    typeof input.order_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.order_date) ||
    Number.isNaN(Date.parse(`${input.order_date}T00:00:00Z`))
  ) {
    throw new PurchaseOrderError("A valid order date is required.");
  }

  const expectedDate = input.expected_delivery_date || null;

  if (
    expectedDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate) ||
      Number.isNaN(Date.parse(`${expectedDate}T00:00:00Z`)))
  ) {
    throw new PurchaseOrderError(
      "Expected delivery date must be a valid date."
    );
  }

  if (
    expectedDate &&
    expectedDate < input.order_date
  ) {
    throw new PurchaseOrderError(
      "Expected delivery date cannot be before the order date."
    );
  }

  if (
    input.notes != null &&
    (typeof input.notes !== "string" || input.notes.length > 10000)
  ) {
    throw new PurchaseOrderError("Notes are too long.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [suppliers] = await connection.execute<DbRow[]>(
      "SELECT id FROM suppliers WHERE id = ? FOR UPDATE",
      [input.supplier_id]
    );

    if (!suppliers.length) {
      throw new PurchaseOrderError("Supplier not found.", 404);
    }

    const poNumber =
      `PO-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO purchase_orders
        (po_number, supplier_id, created_by, status, order_date,
         expected_delivery_date, total_amount, notes)
       VALUES (?, ?, ?, 'DRAFT', ?, ?, 0, ?)`,
      [
        poNumber,
        input.supplier_id,
        userId,
        input.order_date,
        expectedDate,
        input.notes?.trim() || null,
      ]
    );

    const orderId = result.insertId;
    let total = 0;

    for (const item of input.items) {
      const [products] = await connection.execute<DbRow[]>(
        `SELECT id, unit_price
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [item.product_id]
      );

      if (!products.length) {
        throw new PurchaseOrderError(
          `Product ${item.product_id} was not found.`,
          404
        );
      }

      const rawCost =
        item.unit_cost ?? Number(products[0].unit_price);

      if (
        !Number.isFinite(rawCost) ||
        rawCost < 0 ||
        rawCost > 9999999999.99
      ) {
        throw new PurchaseOrderError("Invalid product unit cost.");
      }

      const unitCost = Math.round(rawCost * 100) / 100;
      const lineTotal = Math.round(unitCost * item.quantity_ordered * 100) / 100;

      if (!Number.isSafeInteger(lineTotal * 100)) {
        throw new PurchaseOrderError("Purchase order total is too large.");
      }

      total += lineTotal;

      await connection.execute(
        `INSERT INTO purchase_order_items
          (purchase_order_id, product_id, quantity_ordered,
           quantity_received, unit_cost, line_total)
         VALUES (?, ?, ?, 0, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.quantity_ordered,
          unitCost.toFixed(2),
          lineTotal.toFixed(2),
        ]
      );
    }

    if (!Number.isSafeInteger(Math.round(total * 100))) {
      throw new PurchaseOrderError("Purchase order total is too large.");
    }

    await connection.execute(
      "UPDATE purchase_orders SET total_amount = ? WHERE id = ?",
      [total.toFixed(2), orderId]
    );

    await connection.commit();

    return { id: orderId, po_number: poNumber };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateDraftPurchaseOrder(
  id: number,
  input: PurchaseOrderInput
) {
  validateItems(input.items);

  if (!validPositiveInteger(input.supplier_id)) {
    throw new PurchaseOrderError("Please select a valid supplier.");
  }

  if (
    typeof input.order_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.order_date)
  ) {
    throw new PurchaseOrderError("A valid order date is required.");
  }

  const expectedDate = input.expected_delivery_date || null;

  if (
    expectedDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate) ||
      expectedDate < input.order_date)
  ) {
    throw new PurchaseOrderError("Invalid expected delivery date.");
  }

  if (
    input.notes != null &&
    (typeof input.notes !== "string" || input.notes.length > 10000)
  ) {
    throw new PurchaseOrderError("Notes are too long.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute<DbRow[]>(
      "SELECT id, status FROM purchase_orders WHERE id = ? FOR UPDATE",
      [id]
    );

    if (!orders.length) {
      throw new PurchaseOrderError("Purchase order not found.", 404);
    }

    if (orders[0].status !== "DRAFT") {
      throw new PurchaseOrderError(
        "Only draft purchase orders can be edited."
      );
    }

    const [suppliers] = await connection.execute<DbRow[]>(
      "SELECT id FROM suppliers WHERE id = ?",
      [input.supplier_id]
    );

    if (!suppliers.length) {
      throw new PurchaseOrderError("Supplier not found.", 404);
    }

    let total = 0;
    const normalizedItems: {
      product_id: number;
      quantity_ordered: number;
      unit_cost: number;
      line_total: number;
    }[] = [];

    for (const item of input.items) {
      const [products] = await connection.execute<DbRow[]>(
        "SELECT id, unit_price FROM products WHERE id = ? FOR UPDATE",
        [item.product_id]
      );

      if (!products.length) {
        throw new PurchaseOrderError(
          `Product ${item.product_id} was not found.`,
          404
        );
      }

      const unitCost = Math.round(
        (item.unit_cost ?? Number(products[0].unit_price)) * 100
      ) / 100;

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        throw new PurchaseOrderError("Invalid product unit cost.");
      }

      const lineTotal =
        Math.round(unitCost * item.quantity_ordered * 100) / 100;

      total += lineTotal;

      normalizedItems.push({
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        unit_cost: unitCost,
        line_total: lineTotal,
      });
    }

    await connection.execute(
      `UPDATE purchase_orders
       SET supplier_id = ?, order_date = ?, expected_delivery_date = ?,
           notes = ?, total_amount = ?
       WHERE id = ?`,
      [
        input.supplier_id,
        input.order_date,
        expectedDate,
        input.notes?.trim() || null,
        total.toFixed(2),
        id,
      ]
    );

    await connection.execute(
      "DELETE FROM purchase_order_items WHERE purchase_order_id = ?",
      [id]
    );

    for (const item of normalizedItems) {
      await connection.execute(
        `INSERT INTO purchase_order_items
          (purchase_order_id, product_id, quantity_ordered,
           quantity_received, unit_cost, line_total)
         VALUES (?, ?, ?, 0, ?, ?)`,
        [
          id,
          item.product_id,
          item.quantity_ordered,
          item.unit_cost.toFixed(2),
          item.line_total.toFixed(2),
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function changePurchaseOrderStatus(
  id: number,
  status: PurchaseOrderStatus
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<DbRow[]>(
      "SELECT id, status FROM purchase_orders WHERE id = ? FOR UPDATE",
      [id]
    );

    if (!rows.length) {
      throw new PurchaseOrderError("Purchase order not found.", 404);
    }

    const current = rows[0].status;

    const allowed: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      DRAFT: ["ORDERED", "CANCELLED"],
      ORDERED: ["CANCELLED"],
      PARTIALLY_RECEIVED: [],
      RECEIVED: [],
      CANCELLED: [],
    };

    if (!allowed[current].includes(status)) {
      throw new PurchaseOrderError(
        `Cannot change purchase order from ${current} to ${status}.`
      );
    }

    await connection.execute(
      "UPDATE purchase_orders SET status = ? WHERE id = ?",
      [status, id]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function receivePurchaseOrder(
  id: number,
  receivedItems: { item_id: number; quantity: number }[]
) {
  if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
    throw new PurchaseOrderError("Provide at least one received item.");
  }

  const seen = new Set<number>();

  for (const item of receivedItems) {
    if (
      !validPositiveInteger(item.item_id) ||
      !validPositiveInteger(item.quantity)
    ) {
      throw new PurchaseOrderError(
        "Each received item needs a valid item ID and positive quantity."
      );
    }

    if (seen.has(item.item_id)) {
      throw new PurchaseOrderError(
        "Do not submit the same order item more than once."
      );
    }

    seen.add(item.item_id);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute<DbRow[]>(
      "SELECT id, po_number, status FROM purchase_orders WHERE id = ? FOR UPDATE",
      [id]
    );

    if (!orders.length) {
      throw new PurchaseOrderError("Purchase order not found.", 404);
    }

    if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(orders[0].status)) {
      throw new PurchaseOrderError(
        "Only ordered or partially received orders can receive goods."
      );
    }

    for (const received of receivedItems) {
      const [items] = await connection.execute<DbRow[]>(
        `SELECT id, product_id, quantity_ordered, quantity_received
         FROM purchase_order_items
         WHERE id = ? AND purchase_order_id = ?
         FOR UPDATE`,
        [received.item_id, id]
      );

      if (!items.length) {
        throw new PurchaseOrderError(
          `Order item ${received.item_id} was not found.`,
          404
        );
      }

      const item = items[0];
      const ordered = Number(item.quantity_ordered);
      const alreadyReceived = Number(item.quantity_received);

      if (received.quantity > ordered - alreadyReceived) {
        throw new PurchaseOrderError(
          `Received quantity exceeds the remaining quantity for item ${received.item_id}.`
        );
      }

      await connection.execute(
        "UPDATE products SET quantity = quantity + ? WHERE id = ?",
        [received.quantity, item.product_id]
      );

      await connection.execute(
        `INSERT INTO stock_movements
          (product_id, movement_type, quantity, reference_note)
         VALUES (?, 'IN', ?, ?)`,
        [
          item.product_id,
          received.quantity,
          `Purchase order ${orders[0].po_number}`,
        ]
      );

      await connection.execute(
        `UPDATE purchase_order_items
         SET quantity_received = quantity_received + ?
         WHERE id = ?`,
        [received.quantity, received.item_id]
      );
    }

    const [remaining] = await connection.execute<DbRow[]>(
      `SELECT COUNT(*) AS incomplete
       FROM purchase_order_items
       WHERE purchase_order_id = ?
         AND quantity_received < quantity_ordered`,
      [id]
    );

    const newStatus =
      Number(remaining[0].incomplete) === 0
        ? "RECEIVED"
        : "PARTIALLY_RECEIVED";

    await connection.execute(
      "UPDATE purchase_orders SET status = ? WHERE id = ?",
      [newStatus, id]
    );

    await connection.commit();

    return { status: newStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
