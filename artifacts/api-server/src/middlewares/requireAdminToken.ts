import type { RequestHandler } from "express";
import { verifyAdminToken } from "../routes/admin-auth";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Admin guard middleware for API routes.
 * Validates the Bearer token from Authorization header.
 * Verifies admin still exists and is active in the database.
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

    // Verify admin still exists and is active in DB
    try {
      const [admin] = await db
        .select({
          id: adminsTable.id,
          fullName: adminsTable.fullName,
          username: adminsTable.username,
          role: adminsTable.role,
          isActive: adminsTable.isActive,
        })
        .from(adminsTable)
        .where(eq(adminsTable.id, payload.id))
        .limit(1);

      if (!admin || !admin.isActive) {
        res.status(403).json({ error: "Account not found or disabled" });
        return;
      }

      // Attach full admin info to request
      (req as any).admin = admin;
      next();
    } catch (err) {
      res.status(500).json({ error: "Authentication check failed" });
    }
  };
}
