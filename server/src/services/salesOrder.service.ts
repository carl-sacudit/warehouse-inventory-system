import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/database.js";

export interface SalesOrderItemInput {
  product_id: number;
  quantity: number;
  unit_selling_price: number;
}

export interface SalesOrderInput {
  customer_name?: string | null;
  items: SalesOrderItemInput[];
}

interface SalesRow extends RowDataPacket {
  id: number;
  sale_number: string;
  customer_name: string | null;
  created_by: number;
  created_by_name: string;
  total_revenue: string;
  total_cost: string;
  gross_profit: string;
  created_at: Date;
}

interface SaleProductRow extends RowDataPacket {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  selling_price: string;
  average_unit_cost: string;
}

export class SalesOrderError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = "SalesOrderError";
  }
}

function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export async function listSalesOrders(): Promise<SalesRow[]> {
  const [rows] = await pool.query<SalesRow[]>(
    `SELECT so.id, so.sale_number, so.customer_name, so.created_by,
            u.full_name AS created_by_name, so.total_revenue, so.total_cost,
            so.gross_profit, so.created_at
     FROM sales_orders so
     INNER JOIN users u ON u.id = so.created_by
     ORDER BY so.id DESC`
  );

  return rows;
}

export async function getSalesOrder(id: number) {
  const [orders] = await pool.execute<SalesRow[]>(
    `SELECT so.id, so.sale_number, so.customer_name, so.created_by,
            u.full_name AS created_by_name, so.total_revenue, so.total_cost,
            so.gross_profit, so.created_at
     FROM sales_orders so
     INNER JOIN users u ON u.id = so.created_by
     WHERE so.id = ?`,
    [id]
  );

  if (!orders.length) throw new SalesOrderError("Sale not found.", 404);

  const [items] = await pool.execute<RowDataPacket[]>(
    `SELECT soi.id, soi.product_id, p.sku, p.name AS product_name,
            soi.quantity, soi.unit_selling_price, soi.unit_cost,
            soi.line_revenue, soi.line_cost, soi.line_profit
     FROM sales_order_items soi
     INNER JOIN products p ON p.id = soi.product_id
     WHERE soi.sales_order_id = ?
     ORDER BY soi.id`,
    [id]
  );

  return { ...orders[0], items };
}

export async function createSalesOrder(
  input: SalesOrderInput,
  userId: number
) {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new SalesOrderError("A sale must contain at least one product.");
  }

  const customerName = input.customer_name?.trim() || null;
  if (customerName && customerName.length > 150) {
    throw new SalesOrderError("Customer name must be 150 characters or fewer.");
  }

  const seenProductIds = new Set<number>();
  for (const item of input.items) {
    if (
      !Number.isSafeInteger(item.product_id) || item.product_id <= 0 ||
      !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
      !Number.isFinite(item.unit_selling_price) ||
      item.unit_selling_price < 0 ||
      item.unit_selling_price > 9999999999.99
    ) {
      throw new SalesOrderError("Each item needs a valid product and positive whole-number quantity.");
    }
    if (seenProductIds.has(item.product_id)) {
      throw new SalesOrderError("Each product can appear only once per sale.");
    }
    seenProductIds.add(item.product_id);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const saleNumber = `SO-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const [saleResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales_orders
        (sale_number, customer_name, created_by, total_revenue, total_cost, gross_profit)
       VALUES (?, ?, ?, 0, 0, 0)`,
      [saleNumber, customerName, userId]
    );

    let totalRevenueCents = 0;
    let totalCostCents = 0;

    for (const item of input.items) {
      const [products] = await connection.execute<SaleProductRow[]>(
        `SELECT id, sku, name, quantity, selling_price, average_unit_cost
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [item.product_id]
      );

      const product = products[0];
      if (!product) {
        throw new SalesOrderError(`Product ${item.product_id} was not found.`, 404);
      }

      if (item.quantity > Number(product.quantity)) {
        throw new SalesOrderError(
          `Insufficient stock for ${product.name}. Available quantity: ${product.quantity}.`
        );
      }

      const unitSellingPriceCents = toCents(item.unit_selling_price);
      const unitCostCents = toCents(product.average_unit_cost);
      const lineRevenueCents = unitSellingPriceCents * item.quantity;
      const lineCostCents = unitCostCents * item.quantity;

      if (
        !Number.isSafeInteger(lineRevenueCents) ||
        !Number.isSafeInteger(lineCostCents)
      ) {
        throw new SalesOrderError("Sale total exceeds the supported amount.");
      }

      totalRevenueCents += lineRevenueCents;
      totalCostCents += lineCostCents;

      await connection.execute(
        `INSERT INTO sales_order_items
          (sales_order_id, product_id, quantity, unit_selling_price, unit_cost,
           line_revenue, line_cost, line_profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleResult.insertId,
          product.id,
          item.quantity,
          (unitSellingPriceCents / 100).toFixed(2),
          (unitCostCents / 100).toFixed(2),
          (lineRevenueCents / 100).toFixed(2),
          (lineCostCents / 100).toFixed(2),
          ((lineRevenueCents - lineCostCents) / 100).toFixed(2),
        ]
      );

      await connection.execute(
        "UPDATE products SET quantity = quantity - ? WHERE id = ?",
        [item.quantity, product.id]
      );

      await connection.execute(
        `INSERT INTO stock_movements
          (product_id, movement_type, quantity, reference_note)
         VALUES (?, 'OUT', ?, ?)`,
        [product.id, item.quantity, `Sale ${saleNumber}`]
      );
    }

    if (
      !Number.isSafeInteger(totalRevenueCents) ||
      !Number.isSafeInteger(totalCostCents)
    ) {
      throw new SalesOrderError("Sale total exceeds the supported amount.");
    }

    const grossProfitCents = totalRevenueCents - totalCostCents;
    await connection.execute(
      `UPDATE sales_orders
       SET total_revenue = ?, total_cost = ?, gross_profit = ?
       WHERE id = ?`,
      [
        (totalRevenueCents / 100).toFixed(2),
        (totalCostCents / 100).toFixed(2),
        (grossProfitCents / 100).toFixed(2),
        saleResult.insertId,
      ]
    );

    await connection.commit();

    return {
      id: saleResult.insertId,
      sale_number: saleNumber,
      total_revenue: (totalRevenueCents / 100).toFixed(2),
      total_cost: (totalCostCents / 100).toFixed(2),
      gross_profit: (grossProfitCents / 100).toFixed(2),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}