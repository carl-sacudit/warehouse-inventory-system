import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/database.js";
import productRoutes from "./routes/product.routes.js";
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 5001);

app.use(cors());
app.use(express.json());
app.use("/api/products", productRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "StockFlow API is running!",
  });
});

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

app.listen(PORT, () => {
  console.log(`StockFlow API running at http://localhost:${PORT}`);
});
