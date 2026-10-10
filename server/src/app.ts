
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import pool from "./config/database.js";
import productRoutes from "./routes/product.routes.js";
import authRoutes from "./routes/auth.routes.js";
import stockMovementRoutes from "./routes/stockMovement.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import purchaseOrderRoutes from "./routes/purchaseOrder.routes.js";
const app = express();

const CLIENT_URL =
  process.env.CLIENT_URL ?? "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/stock-movements", stockMovementRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
// API health check
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "StockFlow API is running!",
  });
});

// MySQL health check
app.get("/api/db-health", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS database_name"
    );

    res.json({
      success: true,
      message: "MySQL connection successful!",
      database: rows,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "MySQL connection failed.",
    });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

export default app;