
import type { Request, Response } from "express";
import {
  changePurchaseOrderStatus,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  PurchaseOrderError,
  receivePurchaseOrder,
  updateDraftPurchaseOrder,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
} from "../services/purchaseOrder.service.js";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";

function sendError(res: Response, error: unknown, action: string) {
  if (error instanceof PurchaseOrderError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error(`${action} error:`, error);

  res.status(500).json({
    success: false,
    message: `${action} failed.`,
  });
}

function getId(value: string | string[] | undefined): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function getUserId(res: Response): number {
  return (res.locals.user as AuthenticatedUser).id;
}

export async function getPurchaseOrders(_req: Request, res: Response) {
  try {
    const data = await listPurchaseOrders();
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Fetching purchase orders");
  }
}

export async function getPurchaseOrderById(req: Request, res: Response) {
  const id = getId(req.params.id);

  if (!id) {
    res.status(400).json({ success: false, message: "Invalid order ID." });
    return;
  }

  try {
    const data = await getPurchaseOrder(id);
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Fetching purchase order");
  }
}

export async function postPurchaseOrder(req: Request, res: Response) {
  try {
    const data = await createPurchaseOrder(
      req.body as PurchaseOrderInput,
      getUserId(res)
    );

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Creating purchase order");
  }
}

export async function putPurchaseOrder(req: Request, res: Response) {
  const id = getId(req.params.id);

  if (!id) {
    res.status(400).json({ success: false, message: "Invalid order ID." });
    return;
  }

  try {
    await updateDraftPurchaseOrder(
      id,
      req.body as PurchaseOrderInput
    );

    res.json({
      success: true,
      message: "Purchase order updated successfully.",
    });
  } catch (error) {
    sendError(res, error, "Updating purchase order");
  }
}

export async function patchPurchaseOrderStatus(
  req: Request,
  res: Response
) {
  const id = getId(req.params.id);
  const status = req.body?.status as PurchaseOrderStatus;

  if (!id) {
    res.status(400).json({ success: false, message: "Invalid order ID." });
    return;
  }

  if (!["ORDERED", "CANCELLED"].includes(status)) {
    res.status(400).json({
      success: false,
      message: "Status must be ORDERED or CANCELLED.",
    });
    return;
  }

  try {
    await changePurchaseOrderStatus(id, status);

    res.json({
      success: true,
      message: `Purchase order ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    sendError(res, error, "Updating purchase order status");
  }
}

export async function postReceivePurchaseOrder(
  req: Request,
  res: Response
) {
  const id = getId(req.params.id);

  if (!id) {
    res.status(400).json({ success: false, message: "Invalid order ID." });
    return;
  }

  try {
    const data = await receivePurchaseOrder(id, req.body?.items);

    res.json({
      success: true,
      message: "Goods received successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Receiving purchase order");
  }
}
