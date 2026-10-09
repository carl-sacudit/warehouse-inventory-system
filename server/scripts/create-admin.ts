
import "dotenv/config";
import bcrypt from "bcrypt";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../src/config/database.js";

async function main(): Promise<void> {
  const terminal = createInterface({ input, output });

  try {
    // Prevent creating another administrator if one already exists.
    const [admins] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1"
    );

    if (admins.length > 0) {
      console.log(
        "An administrator already exists. No account was created."
      );
      return;
    }

    const fullName = (
      await terminal.question("Administrator full name: ")
    ).trim();

    const email = (
      await terminal.question("Administrator email: ")
    ).trim().toLowerCase();

    const password = await terminal.question(
      "Administrator password (minimum 12 characters): "
    );

    if (!fullName) {
      throw new Error("Full name is required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    if (password.length < 12) {
      throw new Error(
        "Password must contain at least 12 characters."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'ADMIN')`,
      [fullName, email, passwordHash]
    );

    console.log("\nAdministrator created successfully!");
    console.log(`User ID: ${result.insertId}`);
    console.log(`Email: ${email}`);
    console.log("Role: ADMIN");
  } finally {
    terminal.close();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Administrator creation failed:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});