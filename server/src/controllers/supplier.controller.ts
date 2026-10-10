
import type { Request, Response } from "express";
import pool from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

interface Supplier extends RowDataPacket {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: Date;
}

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  return value.trim() || null;
};

// GET /api/suppliers
export const getSuppliers = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<Supplier[]>(
      `SELECT id, name, contact_person, email, phone, address, created_at
       FROM suppliers
       ORDER BY id DESC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get suppliers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers.",
    });
  }
};

// GET /api/suppliers/:id
export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<Supplier[]>(
      `SELECT id, name, contact_person, email, phone, address, created_at
       FROM suppliers
       WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Get supplier error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch supplier.",
    });
  }
};

// POST /api/suppliers
export const createSupplier = async (req: Request, res: Response) => {
  const { name, contact_person, email, phone, address } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({
      success: false,
      message: "Supplier name is required.",
    });
    return;
  }

  if (name.trim().length > 150) {
    res.status(400).json({
      success: false,
      message: "Supplier name must not exceed 150 characters.",
    });
    return;
  }

  if (
    email !== undefined &&
    email !== null &&
    (typeof email !== "string" || email.trim().length > 150)
  ) {
    res.status(400).json({
      success: false,
      message: "Email must not exceed 150 characters.",
    });
    return;
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid email address.",
    });
    return;
  }

  if (
    contact_person != null &&
    (typeof contact_person !== "string" ||
      contact_person.trim().length > 100)
  ) {
    res.status(400).json({
      success: false,
      message: "Contact person must not exceed 100 characters.",
    });
    return;
  }

  if (
    phone != null &&
    (typeof phone !== "string" || phone.trim().length > 30)
  ) {
    res.status(400).json({
      success: false,
      message: "Phone number must not exceed 30 characters.",
    });
    return;
  }

  if (
    address != null &&
    (typeof address !== "string" || address.trim().length > 255)
  ) {
    res.status(400).json({
      success: false,
      message: "Address must not exceed 255 characters.",
    });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO suppliers
       (name, contact_person, email, phone, address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        normalizeOptionalString(contact_person),
        normalizeOptionalString(email)?.toLowerCase() ?? null,
        normalizeOptionalString(phone),
        normalizeOptionalString(address),
      ]
    );

    res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create supplier.",
    });
  }
};

// PUT /api/suppliers/:id
export const updateSupplier = async (req: Request, res: Response) => {
  const { name, contact_person, email, phone, address } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({
      success: false,
      message: "Supplier name is required.",
    });
    return;
  }

  if (name.trim().length > 150) {
    res.status(400).json({
      success: false,
      message: "Supplier name must not exceed 150 characters.",
    });
    return;
  }

  if (
    email != null &&
    (typeof email !== "string" || email.trim().length > 150)
  ) {
    res.status(400).json({
      success: false,
      message: "Email must not exceed 150 characters.",
    });
    return;
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid email address.",
    });
    return;
  }

  if (
    contact_person != null &&
    (typeof contact_person !== "string" ||
      contact_person.trim().length > 100)
  ) {
    res.status(400).json({
      success: false,
      message: "Contact person must not exceed 100 characters.",
    });
    return;
  }

  if (
    phone != null &&
    (typeof phone !== "string" || phone.trim().length > 30)
  ) {
    res.status(400).json({
      success: false,
      message: "Phone number must not exceed 30 characters.",
    });
    return;
  }

  if (
    address != null &&
    (typeof address !== "string" || address.trim().length > 255)
  ) {
    res.status(400).json({
      success: false,
      message: "Address must not exceed 255 characters.",
    });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE suppliers
       SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?
       WHERE id = ?`,
      [
        name.trim(),
        normalizeOptionalString(contact_person),
        normalizeOptionalString(email)?.toLowerCase() ?? null,
        normalizeOptionalString(phone),
        normalizeOptionalString(address),
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      const [rows] = await pool.execute<Supplier[]>(
        "SELECT id FROM suppliers WHERE id = ?",
        [req.params.id]
      );

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Supplier not found.",
        });
        return;
      }
    }

    res.json({
      success: true,
      message: "Supplier updated successfully.",
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update supplier.",
    });
  }
};

// DELETE /api/suppliers/:id
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM suppliers WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
      return;
    }

    res.json({
      success: true,
      message: "Supplier deleted successfully.",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    const errorCode = (error as { code?: string }).code;

    if (
      errorCode === "ER_ROW_IS_REFERENCED_2" ||
      errorCode === "ER_ROW_IS_REFERENCED"
    ) {
      res.status(409).json({
        success: false,
        message:
          "This supplier is assigned to existing products. Reassign those products before deleting this supplier.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete supplier.",
    });
  }
};
