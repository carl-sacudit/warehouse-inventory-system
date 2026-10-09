import type { Request, Response } from "express";
import pool from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

interface Product extends RowDataPacket {
  id: number;
  category_id: number | null;
  supplier_id: number | null;
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: string;
  reorder_level: number;
  category_name?: string | null;
  supplier_name?: string | null;
}

export const getProducts = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<Product[]>(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       ORDER BY p.id DESC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch products." });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<Product[]>(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch product." });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const {
    category_id,
    supplier_id,
    sku,
    name,
    description,
    quantity = 0,
    unit_price = 0,
    reorder_level = 10,
  } = req.body;

  if (!sku?.trim() || !name?.trim()) {
    res.status(400).json({
      success: false,
      message: "SKU and product name are required.",
    });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO products
       (category_id, supplier_id, sku, name, description, quantity, unit_price, reorder_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id || null,
        supplier_id || null,
        sku.trim(),
        name.trim(),
        description || null,
        quantity,
        unit_price,
        reorder_level,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Create product error:", error);

    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to create product." });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const {
    category_id,
    supplier_id,
    sku,
    name,
    description,
    quantity,
    unit_price,
    reorder_level,
  } = req.body;

  if (!sku?.trim() || !name?.trim()) {
    res.status(400).json({
      success: false,
      message: "SKU and product name are required.",
    });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE products
       SET category_id = ?, supplier_id = ?, sku = ?, name = ?,
           description = ?, quantity = ?, unit_price = ?, reorder_level = ?
       WHERE id = ?`,
      [
        category_id || null,
        supplier_id || null,
        sku.trim(),
        name.trim(),
        description || null,
        quantity,
        unit_price,
        reorder_level,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    res.json({ success: true, message: "Product updated successfully." });
  } catch (error) {
    console.error("Update product error:", error);

    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to update product." });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM products WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    res.json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    console.error("Delete product error:", error);

    if ((error as { code?: string }).code === "ER_ROW_IS_REFERENCED_2") {
      res.status(409).json({
        success: false,
        message: "This product has stock movement history and cannot be deleted.",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to delete product." });
  }
};
