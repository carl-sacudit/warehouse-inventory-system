import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/database.js";

export type MovementType = "IN" | "OUT";

interface StockMovementInput {
  product_id: number;
  movement_type: MovementType;
  quantity: number;
  reference_note?: string | null;
}

interface ProductRow extends RowDataPacket {
  id: number;
  quantity: number;
  name: string;
  sku: string;
}

interface StockMovementRow extends RowDataPacket {
  id: number;
  product_id: number;
  movement_type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  reference_note: string | null;
  created_at: Date;
  product_name: string;
  sku: string;
}

export class StockMovementError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "StockMovementError";
    this.statusCode = statusCode;
  }
}

export async function getStockMovements(): Promise<StockMovementRow[]> {
  const [rows] = await pool.execute<StockMovementRow[]>(
    `SELECT
       sm.id,
       sm.product_id,
       sm.movement_type,
       sm.quantity,
       sm.reference_note,
       sm.created_at,
       p.name AS product_name,
       p.sku
     FROM stock_movements sm
     INNER JOIN products p ON p.id = sm.product_id
     ORDER BY sm.created_at DESC, sm.id DESC`
  );

  return rows;
}

export async function createStockMovement(
  input: StockMovementInput
): Promise<{ id: number; remaining_quantity: number }> {
  const { product_id, movement_type, quantity } = input;
  const referenceNote = input.reference_note?.trim() || null;

  if (!Number.isSafeInteger(product_id) || product_id <= 0) {
    throw new StockMovementError("Please select a valid product.");
  }

  if (movement_type !== "IN" && movement_type !== "OUT") {
    throw new StockMovementError(
      "Movement type must be IN or OUT."
    );
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new StockMovementError(
      "Quantity must be a positive whole number."
    );
  }

  if (referenceNote && referenceNote.length > 255) {
    throw new StockMovementError(
      "The reference note cannot exceed 255 characters."
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.execute<ProductRow[]>(
      `SELECT id, name, sku, quantity
       FROM products
       WHERE id = ?
       FOR UPDATE`,
      [product_id]
    );

    const product = products[0];

    if (!product) {
      throw new StockMovementError("Product not found.", 404);
    }

    const currentQuantity = product.quantity;
    let newQuantity: number;

    if (movement_type === "IN") {
      newQuantity = currentQuantity + quantity;

      if (!Number.isSafeInteger(newQuantity) || newQuantity > 4294967295) {
        throw new StockMovementError(
          "The resulting stock quantity exceeds the allowed limit."
        );
      }
    } else {
      if (quantity > currentQuantity) {
        throw new StockMovementError(
          `Insufficient stock. Available quantity: ${currentQuantity}.`
        );
      }

      newQuantity = currentQuantity - quantity;
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE products
       SET quantity = ?
       WHERE id = ?`,
      [newQuantity, product_id]
    );

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO stock_movements
         (product_id, movement_type, quantity, reference_note)
       VALUES (?, ?, ?, ?)`,
      [product_id, movement_type, quantity, referenceNote]
    );

    await connection.commit();

    return {
      id: result.insertId,
      remaining_quantity: newQuantity,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}