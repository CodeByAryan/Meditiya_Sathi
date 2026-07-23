import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdminToken } from "../middlewares/requireAdminToken";

const router: IRouter = Router();

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isPositiveInteger(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val > 0;
}

// Super Admin check middleware
function requireSuperAdmin(): IRouter extends (args: any[]) => infer R ? R : any {
  return async (req: any, res: any, next: any) => {
    if (!req.admin || req.admin.role !== "Super Admin") {
      res.status(403).json({ error: "Only Super Admin can perform this action" });
      return;
    }
    next();
  };
}

// ── GET /api/admin/manage ─────────────────────────────────────────────────
// List all admins
router.get("/admin/manage", requireAdminToken(), async (_req, res): Promise<void> => {
  try {
    const admins = await db
      .select({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        email: adminsTable.email,
        mobileNumber: adminsTable.mobileNumber,
        role: adminsTable.role,
        isActive: adminsTable.isActive,
        createdAt: adminsTable.createdAt,
        updatedAt: adminsTable.updatedAt,
        lastLogin: adminsTable.lastLogin,
      })
      .from(adminsTable)
      .orderBy(asc(adminsTable.fullName));

    res.json(admins.map(a => ({
      ...a,
      createdAt: a.createdAt?.toISOString?.() || a.createdAt,
      updatedAt: a.updatedAt?.toISOString?.() || a.updatedAt,
      lastLogin: a.lastLogin?.toISOString?.() || a.lastLogin,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch admins" });
  }
});

// ── POST /api/admin/manage ────────────────────────────────────────────────
// Add a new admin (Super Admin only)
router.post("/admin/manage", requireAdminToken(), requireSuperAdmin(), async (req, res): Promise<void> => {
  try {
    const body = req.body || {};

    if (!isNonEmptyString(body.fullName)) {
      res.status(400).json({ error: "Full name is required" });
      return;
    }
    if (!isNonEmptyString(body.username)) {
      res.status(400).json({ error: "Username is required" });
      return;
    }
    if (!isNonEmptyString(body.mobileNumber)) {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }
    if (!isNonEmptyString(body.password)) {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    if (body.password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    if (body.password !== body.confirmPassword) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    const role = body.role === "Super Admin" ? "Super Admin" : "Admin";
    const isActive = body.isActive !== false;
    const fullName = body.fullName.trim();
    const username = body.username.trim().toLowerCase();
    const mobileNumber = body.mobileNumber.trim();
    const email = body.email?.trim() || null;

    // Check duplicate username
    const existingUsername = await db
      .select({ id: adminsTable.id })
      .from(adminsTable)
      .where(eq(adminsTable.username, username))
      .limit(1);
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Username already exists" });
      return;
    }

    // Check duplicate mobile
    const existingMobile = await db
      .select({ id: adminsTable.id })
      .from(adminsTable)
      .where(eq(adminsTable.mobileNumber, mobileNumber))
      .limit(1);
    if (existingMobile.length > 0) {
      res.status(409).json({ error: "Mobile number already exists" });
      return;
    }

    // Check duplicate email
    if (email) {
      const existingEmail = await db
        .select({ id: adminsTable.id })
        .from(adminsTable)
        .where(eq(adminsTable.email, email))
        .limit(1);
      if (existingEmail.length > 0) {
        res.status(409).json({ error: "Email already exists" });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    const [admin] = await db
      .insert(adminsTable)
      .values({
        fullName,
        username,
        mobileNumber,
        email,
        password: hashedPassword,
        role,
        isActive,
      })
      .returning({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        email: adminsTable.email,
        mobileNumber: adminsTable.mobileNumber,
        role: adminsTable.role,
        isActive: adminsTable.isActive,
        createdAt: adminsTable.createdAt,
      });

    res.status(201).json({
      ...admin,
      createdAt: admin.createdAt?.toISOString?.() || admin.createdAt,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Duplicate value. Username, mobile, or email already exists." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to create admin" });
  }
});

// ── PATCH /api/admin/manage/:id ───────────────────────────────────────────
// Edit admin details (Super Admin only)
router.patch("/admin/manage/:id", requireAdminToken(), requireSuperAdmin(), async (req, res): Promise<void> => {
  try {
    const adminId = parseInt(req.params.id as string, 10);
    if (isNaN(adminId)) {
      res.status(400).json({ error: "Invalid admin ID" });
      return;
    }

    const body = req.body || {};
    const updateData: Record<string, unknown> = {};
    const allowedFields = ["fullName", "username", "mobileNumber", "email", "role", "isActive"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "fullName" && !isNonEmptyString(body[field])) {
          res.status(400).json({ error: "Full name cannot be empty" });
          return;
        }
        if (field === "username") {
          if (!isNonEmptyString(body[field])) {
            res.status(400).json({ error: "Username cannot be empty" });
            return;
          }
          updateData[field] = body[field].trim().toLowerCase();
        } else if (field === "mobileNumber") {
          if (!isNonEmptyString(body[field])) {
            res.status(400).json({ error: "Mobile number cannot be empty" });
            return;
          }
          updateData[field] = body[field].trim();
        } else if (field === "role") {
          updateData[field] = body[field] === "Super Admin" ? "Super Admin" : "Admin";
        } else if (field === "isActive") {
          updateData[field] = body[field] === true;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(adminsTable)
      .set(updateData)
      .where(eq(adminsTable.id, adminId))
      .returning({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        email: adminsTable.email,
        mobileNumber: adminsTable.mobileNumber,
        role: adminsTable.role,
        isActive: adminsTable.isActive,
        updatedAt: adminsTable.updatedAt,
      });

    if (!updated) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    res.json({
      ...updated,
      updatedAt: updated.updatedAt?.toISOString?.() || updated.updatedAt,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username, mobile, or email already exists." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update admin" });
  }
});

// ── PATCH /api/admin/manage/:id/status ────────────────────────────────────
// Enable/disable admin (Super Admin only)
router.patch("/admin/manage/:id/status", requireAdminToken(), requireSuperAdmin(), async (req, res): Promise<void> => {
  try {
    const adminId = parseInt(req.params.id as string, 10);
    if (isNaN(adminId)) {
      res.status(400).json({ error: "Invalid admin ID" });
      return;
    }

    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "isActive (boolean) is required" });
      return;
    }

    // Prevent disabling own account
    const requestingAdmin = (req as any).admin;
    if (requestingAdmin.id === adminId && !isActive) {
      res.status(400).json({ error: "You cannot disable your own account" });
      return;
    }

    const [updated] = await db
      .update(adminsTable)
      .set({ isActive })
      .where(eq(adminsTable.id, adminId))
      .returning({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        isActive: adminsTable.isActive,
      });

    if (!updated) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update status" });
  }
});

// ── PATCH /api/admin/manage/:id/reset-password ────────────────────────────
// Reset admin password (Super Admin only)
router.patch("/admin/manage/:id/reset-password", requireAdminToken(), requireSuperAdmin(), async (req, res): Promise<void> => {
  try {
    const adminId = parseInt(req.params.id as string, 10);
    if (isNaN(adminId)) {
      res.status(400).json({ error: "Invalid admin ID" });
      return;
    }

    const { newPassword, confirmPassword } = req.body || {};
    if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const [updated] = await db
      .update(adminsTable)
      .set({ password: hashedPassword })
      .where(eq(adminsTable.id, adminId))
      .returning({ id: adminsTable.id, fullName: adminsTable.fullName });

    if (!updated) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    res.json({ message: "Password reset successfully", id: updated.id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to reset password" });
  }
});

// ── DELETE /api/admin/manage/:id ──────────────────────────────────────────
// Delete admin (Super Admin only)
router.delete("/admin/manage/:id", requireAdminToken(), requireSuperAdmin(), async (req, res): Promise<void> => {
  try {
    const adminId = parseInt(req.params.id as string, 10);
    if (isNaN(adminId)) {
      res.status(400).json({ error: "Invalid admin ID" });
      return;
    }

    // Prevent deleting own account
    const requestingAdmin = (req as any).admin;
    if (requestingAdmin.id === adminId) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }

    const [deleted] = await db
      .delete(adminsTable)
      .where(eq(adminsTable.id, adminId))
      .returning({ id: adminsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete admin" });
  }
});

export default router;
