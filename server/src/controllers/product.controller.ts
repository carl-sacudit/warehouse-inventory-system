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
  supplier_srp: string;
  selling_price: string;
  average_unit_cost: string;
  reorder_level: number;
  category_name?: string | null;
  supplier_name?: string | null;
}

const DEFAULT_CATEGORIES = [
  "Hardware & Construction Supplies",
  "Building Materials",
  "Tools & Equipment",
  "Electrical Supplies",
  "Plumbing Supplies",
  "Fasteners & Fixings",
  "Safety & PPE",
  "Electronics",
  "Office Supplies",
  "Packaging Materials",
];

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

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const [countRows] = await pool.query<
      (RowDataPacket & { category_count: number })[]
    >("SELECT COUNT(*) AS category_count FROM categories");

    if (Number(countRows[0]?.category_count ?? 0) === 0) {
      await pool.query(
        `INSERT INTO categories (name)
         VALUES ${DEFAULT_CATEGORIES.map(() => "(?)").join(", ")}`,
        DEFAULT_CATEGORIES
      );
    }

    const [rows] = await pool.query<
      (RowDataPacket & {
        id: number;
        name: string;
        product_count: number;
      })[]
    >(
      `SELECT c.id, c.name, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product categories.",
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!name || name.length > 100) {
    res.status(400).json({
      success: false,
      message: "Category name is required and must be 100 characters or fewer.",
    });
    return;
  }

  try {
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [name]
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO categories (name) VALUES (?)",
      [name]
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Create category error:", error);

    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to create category." });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const categoryId = Number(req.params.id);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  if (!name || name.length > 100) {
    res.status(400).json({
      success: false,
      message: "Category name is required and must be 100 characters or fewer.",
    });
    return;
  }

  try {
    const [existingCategory] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM categories WHERE id = ?",
      [categoryId]
    );

    if (existingCategory.length === 0) {
      res.status(404).json({ success: false, message: "Category not found." });
      return;
    }

    const [duplicate] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
      [name, categoryId]
    );

    if (duplicate.length > 0) {
      res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
      return;
    }

    await pool.execute<ResultSetHeader>(
      "UPDATE categories SET name = ? WHERE id = ?",
      [name, categoryId]
    );

    res.json({ success: true, message: "Category updated successfully." });
  } catch (error) {
    console.error("Update category error:", error);

    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to update category." });
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

export const saveProductImage = (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "Choose an image to upload." });
    return;
  }

  res.status(201).json({
    success: true,
    data: { image_url: `/uploads/${req.file.filename}` },
  });
};

export const createProduct = async (req: Request, res: Response) => {
  const {
    category_id,
    supplier_id,
    sku,
    name,
    description,
    image_url,
    quantity = 0,
    supplier_srp = 0,
    average_unit_cost = req.body.unit_price ?? 0,
    reorder_level = 10,
  } = req.body;
  const supplierSrp = Number(supplier_srp);
  const sellingPrice = Number(req.body.selling_price ?? req.body.unit_price ?? 0);
  const initialAverageCost = Number(average_unit_cost);

  if (!sku?.trim() || !name?.trim()) {
    res.status(400).json({
      success: false,
      message: "SKU and product name are required.",
    });
    return;
  }

  if (
    !Number.isFinite(supplierSrp) || supplierSrp < 0 ||
    !Number.isFinite(sellingPrice) || sellingPrice < 0 ||
    !Number.isFinite(initialAverageCost) || initialAverageCost < 0 ||
    !Number.isSafeInteger(quantity) || quantity < 0 ||
    !Number.isSafeInteger(reorder_level) || reorder_level < 0
  ) {
    res.status(400).json({
      success: false,
      message: "Supplier SRP, selling price, and starting cost must be valid non-negative amounts.",
    });
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO products
        (category_id, supplier_id, sku, name, description, image_url, quantity,
         unit_price, supplier_srp, selling_price, average_unit_cost, reorder_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        category_id || null,
        supplier_id || null,
        sku.trim(),
        name.trim(),
        description || null,
        image_url?.trim() || null,
        quantity,
        sellingPrice,
        supplierSrp,
        sellingPrice,
        initialAverageCost,
        reorder_level,
      ]
    );

    if (quantity > 0) {
      await connection.execute(
        `INSERT INTO stock_movements
          (product_id, movement_type, quantity, reference_note)
         VALUES (?, 'IN', ?, 'Initial product stock')`,
        [result.insertId, quantity]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: { id: result.insertId },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create product error:", error);

    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to create product." });
  } finally {
    connection.release();
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const {
    category_id,
    supplier_id,
    sku,
    name,
    description,
    image_url,
    unit_price,
    supplier_srp,
    selling_price,
    reorder_level,
  } = req.body;
  const supplierSrp = Number(supplier_srp ?? 0);
  const sellingPrice = Number(selling_price ?? unit_price ?? 0);

  if (!sku?.trim() || !name?.trim()) {
    res.status(400).json({
      success: false,
      message: "SKU and product name are required.",
    });
    return;
  }

  if (
    !Number.isFinite(supplierSrp) || supplierSrp < 0 ||
    !Number.isFinite(sellingPrice) || sellingPrice < 0
  ) {
    res.status(400).json({
      success: false,
      message: "Supplier SRP and selling price must be valid non-negative amounts.",
    });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE products
       SET category_id = ?, supplier_id = ?, sku = ?, name = ?,
           description = ?, image_url = ?, unit_price = ?,
           supplier_srp = ?, selling_price = ?, reorder_level = ?
       WHERE id = ?`,
      [
        category_id || null,
        supplier_id || null,
        sku.trim(),
        name.trim(),
        description || null,
        image_url?.trim() || null,
        sellingPrice,
        supplierSrp,
        sellingPrice,
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
        message: "This product is referenced by inventory or sales history and cannot be deleted.",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to delete product." });
  }
};
