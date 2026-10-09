import type { Request, Response } from "express";
import {
  createStockMovement,
  getStockMovements,
  StockMovementError,
  type MovementType,
} from "../services/stockMovement.service.js";

export async function getMovements(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const movements = await getStockMovements();

    res.status(200).json({
      success: true,
      data: movements,
    });
  } catch (error) {
    console.error("Failed to fetch stock movements:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve stock movements.",
    });
  }
}

export async function createMovement(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { product_id, movement_type, quantity, reference_note } =
      req.body ?? {};

    if (
      typeof product_id !== "number" ||
      typeof quantity !== "number" ||
      typeof movement_type !== "string"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Product ID, quantity, and movement type must be provided with valid types.",
      });
      return;
    }

    if (
      reference_note !== undefined &&
      reference_note !== null &&
      typeof reference_note !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Reference note must be a string.",
      });
      return;
    }

    const result = await createStockMovement({
      product_id,
      movement_type: movement_type as MovementType,
      quantity,
      reference_note,
    });

    res.status(201).json({
      success: true,
      message: "Stock movement recorded successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof StockMovementError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error("Failed to create stock movement:", error);

    res.status(500).json({
      success: false,
      message: "Failed to record stock movement.",
    });
  }
}
