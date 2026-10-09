
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export type UserRole =
  | "ADMIN"
  | "WAREHOUSE_MANAGER"
  | "INVENTORY_STAFF";

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.stockflow_token as string | undefined;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded === "string") {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    const payload = decoded as JwtPayload;
    const validRoles: UserRole[] = [
      "ADMIN",
      "WAREHOUSE_MANAGER",
      "INVENTORY_STAFF",
    ];

    if (
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      !validRoles.includes(payload.role as UserRole)
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    res.locals.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role as UserRole,
    } satisfies AuthenticatedUser;

    next();
  } catch {
    res.clearCookie("stockflow_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please log in again.",
    });
  }
}

export function allowRoles(...roles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user as AuthenticatedUser | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
}