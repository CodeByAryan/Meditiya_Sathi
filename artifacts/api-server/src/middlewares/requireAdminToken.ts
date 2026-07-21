import type { RequestHandler } from "express";
import { verifyAdminToken } from "../routes/admin-auth";

/**
 * Admin guard middleware for API routes.
 * Validates the Bearer token from Authorization header.
 */
export function requireAdminToken(): RequestHandler {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyAdminToken(token);

    if (!payload) {
      res.status(403).json({ error: "Forbidden - invalid or expired token" });
      return;
    }

    // Attach admin info to request
    (req as any).admin = payload;
    next();
  };
}

