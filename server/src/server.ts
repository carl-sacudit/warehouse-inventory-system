
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/database.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "StockFlow API is running!",
  });
});

app.get("/api/db-health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS database_name");

    res.json({
      success: true,
      message: "MySQL connected successfully!",
      database: rows,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`StockFlow API running at http://localhost:${PORT}`);
});