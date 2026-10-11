import type { Request, Response } from "express";
import {
  createSalesOrder,
  getSalesOrder,
  listSalesOrders,
  SalesOrderError,
} from "../services/salesOrder.service.js";

export async function getSalesOrders(_req: Request, res: Response) {
  try {
    res.json({ success: true, data: await listSalesOrders() });
  } catch (error) {
    console.error("Get sales orders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch sales orders." });
  }
}

export async function getSalesOrderById(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: "Invalid sale ID." });
    return;
  }

  try {
    res.json({ success: true, data: await getSalesOrder(id) });
  } catch (error) {
    if (error instanceof SalesOrderError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("Get sales order error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch sale." });
  }
}

export async function postSalesOrder(req: Request, res: Response) {
  const user = res.locals.user as { id: number } | undefined;
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const result = await createSalesOrder(req.body ?? {}, user.id);
    res.status(201).json({
      success: true,
      message: "Sale recorded successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof SalesOrderError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("Create sales order error:", error);
    res.status(500).json({ success: false, message: "Failed to record sale." });
  }
}