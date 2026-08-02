import type { RequestHandler } from "express";
import { db, adminsTable, festivalsTable, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyAdminToken } from "../routes/admin-auth";

/**
 * Permission map defining what each role can access.
 * Extend this as new features are added.
 */
export const PERMISSIONS = {
  // ── Admin Management ───────────────────────────────────
  "manage:admins": ["Super Admin"],
  "manage:volunteers": ["Super Admin", "Admin"],
  "view:admin-management": ["Super Admin"],
  "view:team-management": ["Super Admin", "Admin"],

  // ── Building & Resident Management ─────────────────────
  "manage:buildings": ["Super Admin"], // Full CRUD
  "view:buildings": ["Super Admin", "Admin"], // View only
  "manage:residents": ["Super Admin", "Admin"], // Add/Edit/Delete
  "delete:residents": ["Super Admin", "Admin"],
  "search:residents": ["Super Admin", "Admin", "Volunteer"],

  // ── Festival Management ────────────────────────────────
  "manage:festivals": ["Super Admin", "Admin"], // Full CRUD
  "delete:festivals": ["Super Admin"], // Only Super Admin can delete festivals
  "view:assigned-festivals": ["Volunteer"],
  "create:donations": ["Super Admin", "Admin", "Volunteer"], // Anyone can create
  "edit:own-donations": ["Super Admin", "Admin", "Volunteer"], // Edit own only for Volunteer
  "edit:all-donations": ["Super Admin", "Admin"], // Admin/Super Admin can edit any
  "delete:donations": ["Super Admin", "Admin"], // Only Super Admin/Admin can delete

  // ── Event Management ───────────────────────────────────
  "manage:events": ["Super Admin", "Admin"], // Create/Delete/Assign
  "edit:assigned-events": ["Volunteer"], // Edit only assigned events

  // ── Reports ────────────────────────────────────────────
  "view:reports": ["Super Admin", "Admin"],
  "view:personal-reports": ["Super Admin", "Admin", "Volunteer"], // Volunteer sees own stats
  "view:dashboard": ["Super Admin", "Admin", "Volunteer"],

  // ── System Settings ────────────────────────────────────
  "manage:settings": ["Super Admin"],

  // ── Gallery & Notices ──────────────────────────────────
  "manage:gallery": ["Super Admin", "Admin"],
  "manage:notices": ["Super Admin", "Admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[] | undefined;
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Load the admin from the JWT and attach it to `req.admin`.
 * This is the shared auth logic used by role/permission middlewares.
 */
async function loadAdminFromRequest(req: any, res: any): Promise<boolean> {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  const token = authHeader.slice(7);
  const payload = verifyAdminToken(token);

  if (!payload) {
    res.status(403).json({ error: "Forbidden - invalid or expired token" });
    return false;
  }

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
      return false;
    }

    // Attach full admin info to request
    req.admin = admin;
    return true;
  } catch (err) {
    res.status(500).json({ error: "Authentication check failed" });
    return false;
  }
}

/**
 * Middleware factory: require a specific permission.
 *
 * Usage: router.get("/path", requirePermission("manage:festivals"), handler)
 */
export function requirePermission(permission: Permission): RequestHandler {
  return async (req, res, next) => {
    const ok = await loadAdminFromRequest(req, res);
    if (!ok) return;

    const admin = (req as any).admin;
    if (!hasPermission(admin.role, permission)) {
      res.status(403).json({
        error: `Forbidden - your role (${admin.role}) does not have permission: ${permission}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: require one of the specified roles.
 *
 * Usage: router.get("/path", requireRole("Super Admin", "Admin"), handler)
 */
export function requireRole(...roles: string[]): RequestHandler {
  return async (req, res, next) => {
    const ok = await loadAdminFromRequest(req, res);
    if (!ok) return;

    const admin = (req as any).admin;
    if (!roles.includes(admin.role)) {
      res.status(403).json({
        error: `Forbidden - requires one of these roles: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Helper to check if an admin has access to a specific resource.
 * For example, checking if a volunteer is assigned to a specific festival.
 */
export function isResourceOwner(
  adminRole: string,
  adminId: string,
  assignedVolunteerId: string | null | undefined,
): boolean {
  // Super Admin and Admin can access all resources
  if (adminRole === "Super Admin" || adminRole === "Admin") return true;
  // Volunteers can only access resources assigned to them
  return adminRole === "Volunteer" && assignedVolunteerId === adminId;
}

/**
 * Async helper: check if a Volunteer can access a festival by id.
 * Super Admin/Admin always have access. Volunteers only if assigned.
 */
export async function canAccessFestival(
  adminRole: string,
  adminId: string,
  festivalId: number,
): Promise<boolean> {
  if (adminRole === "Super Admin" || adminRole === "Admin") return true;
  if (adminRole !== "Volunteer") return false;

  const [festival] = await db
    .select({ assignedVolunteerId: festivalsTable.assignedVolunteerId })
    .from(festivalsTable)
    .where(eq(festivalsTable.id, festivalId))
    .limit(1);

  return !!festival && festival.assignedVolunteerId === adminId;
}

/**
 * Async helper: check if a Volunteer can access an event by id.
 * Super Admin/Admin always have access. Volunteers only if assigned.
 */
export async function canAccessEvent(
  adminRole: string,
  adminId: string,
  eventId: number,
): Promise<boolean> {
  if (adminRole === "Super Admin" || adminRole === "Admin") return true;
  if (adminRole !== "Volunteer") return false;

  const [event] = await db
    .select({ assignedVolunteerId: eventsTable.assignedVolunteerId })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  return !!event && event.assignedVolunteerId === adminId;
}

/**
 * Async helper: check if a Volunteer owns a specific donation record.
 * Super Admin/Admin can always edit/delete. Volunteers only their own entries.
 */
export async function canAccessDonation(
  adminRole: string,
  adminId: string,
  collectedByAdminId: string | null | undefined,
): Promise<boolean> {
  if (adminRole === "Super Admin" || adminRole === "Admin") return true;
  if (adminRole !== "Volunteer") return false;
  return collectedByAdminId === adminId;
}

