
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import pool from "../config/database.js";
import type { AuthenticatedUser, UserRole } from "../middleware/auth.middleware.js";

interface UserRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: number | boolean;
}

const COOKIE_NAME = "stockflow_token";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 1000,
    path: "/",
  };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password =
      typeof req.body?.password === "string"
        ? req.body.password
        : "";

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = rows[0];

    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn: "1h" }
    );

    res.cookie(COOKIE_NAME, token, cookieOptions());

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
}

export async function logout(
  _req: Request,
  res: Response
): Promise<void> {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
}

export async function getCurrentUser(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const authenticatedUser = res.locals.user as AuthenticatedUser;

    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [authenticatedUser.id]
    );

    const user = rows[0];

    if (!user) {
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      res.status(401).json({
        success: false,
        message: "Your account is unavailable. Please log in again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Unable to retrieve current user:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve your account.",
    });
  }
}