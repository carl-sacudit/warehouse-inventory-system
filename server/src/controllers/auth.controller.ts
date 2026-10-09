
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import pool from "../config/database.js";
import type {
  AuthenticatedUser,
  UserRole,
} from "../middleware/auth.middleware.js";

interface UserRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: number | boolean;
}

const COOKIE_NAME = "stockflow_token";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 1000,
  };
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

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: "This account has been disabled.",
      });
      return;
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN ||
      "1h") as SignOptions["expiresIn"];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn }
    );

    res.cookie(COOKIE_NAME, token, cookieOptions());

    const safeUser: AuthenticatedUser & { full_name: string } = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };

    res.json({
      success: true,
      message: "Login successful.",
      data: { user: safeUser },
    });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
}

export function logout(
  _req: Request,
  res: Response
): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.json({
    success: true,
    message: "Logged out successfully.",
  });
}

export function getCurrentUser(
  _req: Request,
  res: Response
): void {
  const user = res.locals.user as AuthenticatedUser;

  res.json({
    success: true,
    data: { user },
  });
}