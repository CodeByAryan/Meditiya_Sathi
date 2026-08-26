import { Router, type IRouter } from "express";
import { db, buildingsTable, wingsTable, residentsTable, festivalsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();

// ── Helper: simple validation ──────────────────────────────────────────────

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isPositiveInteger(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val > 0;
}

// ── GET /api/buildings ──────────────────────────────────────────────────────
// Public: Fetch all active buildings

router.get("/buildings", async (_req, res): Promise<void> => {
  try {
    const buildings = await db
      .select()
      .from(buildingsTable)
      .where(eq(buildingsTable.status, "active"))
      .orderBy(buildingsTable.buildingName);

    res.json(buildings.map(b => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch buildings" });
  }
});

// ── GET /api/buildings/:buildingId/wings ────────────────────────────────────
// Public: Fetch active wings for a specific building

router.get("/buildings/:buildingId/wings", async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.buildingId as string, 10);
    if (isNaN(buildingId)) {
      res.status(400).json({ error: "Invalid building ID" });
      return;
    }

    const wings = await db
      .select()
      .from(wingsTable)
      .where(and(
        eq(wingsTable.buildingId, buildingId),
        eq(wingsTable.status, "active"),
      ))
      .orderBy(wingsTable.wingName);

    res.json(wings.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch wings" });
  }
});

// ── GET /api/admin/buildings ────────────────────────────────────────────────
// Fetch all active buildings

router.get("/admin/buildings", requireRole("Super Admin", "Admin"), async (_req, res): Promise<void> => {
  try {
    const buildings = await db
      .select()
      .from(buildingsTable)
      .where(eq(buildingsTable.status, "active"))
      .orderBy(buildingsTable.buildingName);

    res.json(buildings.map(b => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch buildings" });
  }
});

// ── GET /api/admin/buildings/:buildingId/wings ──────────────────────────────
// Fetch wings for a specific building

router.get("/admin/buildings/:buildingId/wings", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.buildingId as string, 10);
    if (isNaN(buildingId)) {
      res.status(400).json({ error: "Invalid building ID" });
      return;
    }

    const wings = await db
      .select()
      .from(wingsTable)
      .where(and(
        eq(wingsTable.buildingId, buildingId),
        eq(wingsTable.status, "active"),
      ))
      .orderBy(wingsTable.wingName);

    res.json(wings.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch wings" });
  }
});

// ── GET /api/admin/residents/check-mobile/:mobile ───────────────────────────
// Check if a mobile number is already registered

router.get("/admin/residents/check-mobile/:mobile", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const mobile = req.params.mobile as string;
    if (!isNonEmptyString(mobile)) {
      res.status(400).json({ error: "Invalid mobile number" });
      return;
    }

    const existing = await db
      .select({ id: residentsTable.id })
      .from(residentsTable)
      .where(eq(residentsTable.mobile, mobile.trim()))
      .limit(1);

    res.json({ exists: existing.length > 0 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Check failed" });
  }
});

// ── GET /api/admin/residents/check-flat ─────────────────────────────────────
// Check if a flat is already registered in a building/wing

router.get("/admin/residents/check-flat", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.query.buildingId as string, 10);
    const flatNo = req.query.flatNo as string | undefined;
    const wingIdParam = req.query.wingId as string | undefined;
    const wingId = wingIdParam ? parseInt(wingIdParam, 10) : undefined;

    if (isNaN(buildingId) || !isNonEmptyString(flatNo)) {
      res.status(400).json({ error: "Missing or invalid parameters" });
      return;
    }

    const conditions = [
      eq(residentsTable.buildingId, buildingId),
      eq(residentsTable.flatNo, flatNo!.trim()),
    ];

    if (wingId != null && !isNaN(wingId)) {
      conditions.push(eq(residentsTable.wingId, wingId));
    } else {
      conditions.push(sql`${residentsTable.wingId} IS NULL`);
    }

    const existing = await db
      .select({ id: residentsTable.id })
      .from(residentsTable)
      .where(and(...conditions))
      .limit(1);

    res.json({ exists: existing.length > 0 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Check failed" });
  }
});

// ── POST /api/admin/residents ───────────────────────────────────────────────
// Create a new resident (with duplicate checks)

router.post("/admin/residents", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const body = req.body || {};

    // Manual validation
    if (!isNonEmptyString(body.fullName)) {
      res.status(400).json({ error: "Resident name is required" });
      return;
    }
    if (!isNonEmptyString(body.mobile)) {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }
    if (!isPositiveInteger(body.buildingId)) {
      res.status(400).json({ error: "Please select a building" });
      return;
    }
    if (!isNonEmptyString(body.flatNo)) {
      res.status(400).json({ error: "Flat number is required" });
      return;
    }

    const fullName = body.fullName.trim();
    const mobile = body.mobile.trim();
    const buildingId = body.buildingId;
    const wingId = body.wingId != null && isPositiveInteger(body.wingId) ? body.wingId : null;
    const flatNo = body.flatNo.trim();
    const address = body.address != null && typeof body.address === "string" ? body.address.trim() || null : null;
    const status = body.status === "inactive" ? "inactive" : "active";

    // Check duplicate mobile
    const existingMobile = await db
      .select({ id: residentsTable.id })
      .from(residentsTable)
      .where(eq(residentsTable.mobile, mobile))
      .limit(1);

    if (existingMobile.length > 0) {
      res.status(409).json({ error: "This mobile number is already registered." });
      return;
    }

    // Check duplicate flat in building/wing
    const flatConditions = [
      eq(residentsTable.buildingId, buildingId),
      eq(residentsTable.flatNo, flatNo),
    ];

    if (wingId != null) {
      flatConditions.push(eq(residentsTable.wingId, wingId));
    } else {
      flatConditions.push(sql`${residentsTable.wingId} IS NULL`);
    }

    const existingFlat = await db
      .select({ id: residentsTable.id })
      .from(residentsTable)
      .where(and(...flatConditions))
      .limit(1);

    if (existingFlat.length > 0) {
      res.status(409).json({ error: "Resident already exists for this flat." });
      return;
    }

    // Create resident
    const [resident] = await db
      .insert(residentsTable)
      .values({
        fullName,
        mobile,
        buildingId,
        wingId,
        flatNo,
        address,
        status,
      })
      .returning();

    res.status(201).json({
      ...resident,
      createdAt: resident.createdAt.toISOString(),
      updatedAt: resident.updatedAt.toISOString(),
    });
  } catch (err: any) {
    // Handle unique constraint violations
    if (err?.code === "23505") {
      const constraint = err?.constraint || "";
      if (constraint.includes("mobile")) {
        res.status(409).json({ error: "This mobile number is already registered." });
      } else {
        res.status(409).json({ error: "Resident already exists for this flat." });
      }
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to create resident" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUILDING & WING MANAGEMENT ENDPOINTS (for the Buildings admin page)
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/buildings/manage ──────────────────────────────────────────
// List ALL buildings (including inactive) for management

router.get("/admin/buildings/manage", requireRole("Super Admin", "Admin"), async (_req, res): Promise<void> => {
  try {
    const buildings = await db
      .select()
      .from(buildingsTable)
      .orderBy(buildingsTable.buildingName);

    res.json(buildings.map(b => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch buildings" });
  }
});

// ── POST /api/admin/buildings ───────────────────────────────────────────────
// Create a new building

router.post("/admin/buildings", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const { buildingName, hasWings } = req.body || {};

    if (!isNonEmptyString(buildingName)) {
      res.status(400).json({ error: "Building name is required" });
      return;
    }

    const [building] = await db
      .insert(buildingsTable)
      .values({ buildingName: buildingName.trim(), hasWings: hasWings === true })
      .returning();

    res.status(201).json({
      ...building,
      createdAt: building.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A building with this name already exists." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to create building" });
  }
});

// ── PATCH /api/admin/buildings/:id ──────────────────────────────────────────
// Update a building (status)

router.patch("/admin/buildings/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.id as string, 10);
    if (isNaN(buildingId)) {
      res.status(400).json({ error: "Invalid building ID" });
      return;
    }

    const allowedFields = ["buildingName", "hasWings", "status"] as const;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(buildingsTable)
      .set(updateData)
      .where(eq(buildingsTable.id, buildingId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Building not found" });
      return;
    }

    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update building" });
  }
});

// ── DELETE /api/admin/buildings/:id ─────────────────────────────────────────
// Delete a building (cascades to wings and residents)

router.delete("/admin/buildings/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.id as string, 10);
    if (isNaN(buildingId)) {
      res.status(400).json({ error: "Invalid building ID" });
      return;
    }

    const [deleted] = await db
      .delete(buildingsTable)
      .where(eq(buildingsTable.id, buildingId))
      .returning({ id: buildingsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Building not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete building" });
  }
});

// ── GET /api/admin/buildings/:id/wings/manage ───────────────────────────────
// List ALL wings (including inactive) for management

router.get("/admin/buildings/:id/wings/manage", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.id as string, 10);
    if (isNaN(buildingId)) {
      res.status(400).json({ error: "Invalid building ID" });
      return;
    }

    const wings = await db
      .select()
      .from(wingsTable)
      .where(eq(wingsTable.buildingId, buildingId))
      .orderBy(wingsTable.wingName);

    res.json(wings.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch wings" });
  }
});

// ── POST /api/admin/buildings/:id/wings ─────────────────────────────────────
// Create a new wing for a building

router.post("/admin/buildings/:id/wings", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.id as string, 10);
    if (isNaN(buildingId)) {
      res.status(400).json({ error: "Invalid building ID" });
      return;
    }

    const { wingName } = req.body || {};
    if (!isNonEmptyString(wingName)) {
      res.status(400).json({ error: "Wing name is required" });
      return;
    }

    const [wing] = await db
      .insert(wingsTable)
      .values({ buildingId, wingName: wingName.trim() })
      .returning();

    res.status(201).json({
      ...wing,
      createdAt: wing.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A wing with this name already exists for this building." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to create wing" });
  }
});

// ── PATCH /api/admin/buildings/:id/wings/:wingId ──────────────────────────
// Update a wing (status)

router.patch("/admin/buildings/:id/wings/:wingId", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.id as string, 10);
    const wingId = parseInt(req.params.wingId as string, 10);
    if (isNaN(buildingId) || isNaN(wingId)) {
      res.status(400).json({ error: "Invalid parameters" });
      return;
    }

    const allowedFields = ["wingName", "status"] as const;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(wingsTable)
      .set(updateData)
      .where(and(eq(wingsTable.id, wingId), eq(wingsTable.buildingId, buildingId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Wing not found" });
      return;
    }

    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update wing" });
  }
});

// ── DELETE /api/admin/buildings/:id/wings/:wingId ────────────────────────
// Delete a wing

router.delete("/admin/buildings/:id/wings/:wingId", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const buildingId = parseInt(req.params.id as string, 10);
    const wingId = parseInt(req.params.wingId as string, 10);
    if (isNaN(buildingId) || isNaN(wingId)) {
      res.status(400).json({ error: "Invalid parameters" });
      return;
    }

    const [deleted] = await db
      .delete(wingsTable)
      .where(and(eq(wingsTable.id, wingId), eq(wingsTable.buildingId, buildingId)))
      .returning({ id: wingsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Wing not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete wing" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// RESIDENTS LIST / CRUD ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/residents/:id/festival-history ─────────────────────────────
// Get festival donation history for a specific resident
// Volunteers can view festival history for donation entry purposes

router.get("/admin/residents/:id/festival-history", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const residentId = parseInt(req.params.id as string, 10);
    if (isNaN(residentId)) {
      res.status(400).json({ error: "Invalid resident ID" });
      return;
    }

    const rows = await db.execute(
      sql`SELECT f.name as festival_name, f.year, f.id as festival_id,
          fd.payment_method, fd.amount, fd.receipt_number, fd.payment_date,
          fd.collected_by_admin_name, fd.notes
          FROM festival_donations fd
          JOIN festivals f ON fd.festival_id = f.id
          WHERE fd.resident_id = ${residentId}
          ORDER BY f.year DESC, f.name`
    );

    const history = (rows.rows || []).map((row: any) => ({
      festivalName: row.festival_name,
      year: row.year,
      festivalId: row.festival_id,
      paymentMethod: row.payment_method,
      amount: row.amount ? parseFloat(String(row.amount)) : null,
      receiptNumber: row.receipt_number,
      paymentDate: row.payment_date,
      collectedBy: row.collected_by_admin_name,
      notes: row.notes,
    }));

    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch festival history" });
  }
});

// ── GET /api/admin/residents/search ───────────────────────────────────────────
// Search residents for donation form (with festival history)

router.get("/admin/residents/search", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const q = (req.query.q as string)?.trim() || "";
    const buildingIdParam = req.query.buildingId as string | undefined;
    const wingIdParam = req.query.wingId as string | undefined;
    const festivalIdParam = req.query.festivalId as string | undefined;
    const admin = (req as any).admin;

    // A Volunteer may search only the residents in an assigned festival. This
    // prevents the resident search endpoint from becoming a system-wide lookup.
    if (admin.role === "Volunteer") {
      const festivalId = parseInt(festivalIdParam || "", 10);
      if (!Number.isInteger(festivalId)) {
        res.status(403).json({ error: "A festival assignment is required" });
        return;
      }
      const [festival] = await db.select({ id: festivalsTable.id })
        .from(festivalsTable)
        .where(and(eq(festivalsTable.id, festivalId), eq(festivalsTable.assignedVolunteerId, admin.id)))
        .limit(1);
      if (!festival) {
        res.status(403).json({ error: "You can only search residents for assigned festivals" });
        return;
      }
    }

    if (q.length < 1 && !buildingIdParam) {
      res.json({ residents: [], festivalHistory: {} });
      return;
    }

    let query = sql`
      SELECT r.id, r.full_name, r.mobile, r.flat_no, r.building_id, r.wing_id,
             b.building_name, w.wing_name
      FROM residents r
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN wings w ON r.wing_id = w.id
      WHERE r.status = 'active'
    `;

    if (q) {
      const searchPattern = `%${q.replace(/'/g, "''")}%`;
      query = sql`${query} AND (
        LOWER(r.full_name) LIKE LOWER(${searchPattern})
        OR r.mobile LIKE ${searchPattern}
        OR LOWER(r.flat_no) LIKE LOWER(${searchPattern})
        OR LOWER(b.building_name) LIKE LOWER(${searchPattern})
        OR LOWER(COALESCE(w.wing_name, '')) LIKE LOWER(${searchPattern})
      )`;
    }

    if (buildingIdParam) {
      const bid = parseInt(buildingIdParam, 10);
      if (!isNaN(bid)) {
        query = sql`${query} AND r.building_id = ${bid}`;
      }
    }

    if (wingIdParam) {
      const wid = parseInt(wingIdParam, 10);
      if (!isNaN(wid)) {
        query = sql`${query} AND r.wing_id = ${wid}`;
      }
    }

    query = sql`${query} ORDER BY r.full_name LIMIT 20`;

    const result = await db.execute(query);
    const residents = (result.rows || []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      mobile: row.mobile,
      flatNo: row.flat_no,
      buildingId: row.building_id,
      wingId: row.wing_id,
      buildingName: row.building_name,
      wingName: row.wing_name,
    }));

    // If festivalId is provided, fetch festival history for each resident
    let festivalHistory: Record<number, any[]> = {};
    if (festivalIdParam) {
      const fid = parseInt(festivalIdParam, 10);
      if (!isNaN(fid) && residents.length > 0) {
        const residentIds = residents.map(r => r.id);
        // Use PostgreSQL ARRAY[] syntax so ANY() receives a single array argument
        const historyResult = await db.execute(
          sql`SELECT fd.resident_id, f.name as festival_name, f.year, fd.payment_method, fd.amount, fd.receipt_number
              FROM festival_donations fd
              JOIN festivals f ON fd.festival_id = f.id
              WHERE fd.resident_id = ANY(ARRAY[${sql.join(residentIds, sql`, `)}])
                AND fd.festival_id != ${fid}
              ORDER BY f.year DESC, f.name`
        );
        for (const row of (historyResult.rows || []) as any[]) {
          if (!festivalHistory[row.resident_id]) festivalHistory[row.resident_id] = [];
          festivalHistory[row.resident_id].push({
            festivalName: row.festival_name,
            year: row.year,
            paymentMethod: row.payment_method,
            amount: row.amount ? parseFloat(String(row.amount)) : null,
            receiptNumber: row.receipt_number,
          });
        }
      }
    }

    res.json({ residents, festivalHistory });
  } catch (err: any) {
    console.error("Error searching residents:", err);
    res.status(500).json({ error: err?.message || "Failed to search residents" });
  }
});

// ── GET /api/admin/residents ─────────────────────────────────────────────────
// List residents with search, filter, sort, pagination -- includes building/wing names

router.get("/admin/residents", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || "";
    const buildingIdParam = req.query.buildingId as string | undefined;
    const wingIdParam = req.query.wingId as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

    const allowedSortFields = ["fullName", "flatNo", "createdAt", "buildingName"];
    const effectiveSort = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    // Build WHERE conditions
    const conditions: ReturnType<typeof sql>[] = [];

    if (statusFilter === "active" || statusFilter === "inactive") {
      conditions.push(eq(residentsTable.status, statusFilter));
    }

    const buildingId = buildingIdParam ? parseInt(buildingIdParam, 10) : undefined;
    if (buildingId && !isNaN(buildingId)) {
      conditions.push(eq(residentsTable.buildingId, buildingId));
    }

    const wingId = wingIdParam ? parseInt(wingIdParam, 10) : undefined;
    if (wingId && !isNaN(wingId)) {
      conditions.push(eq(residentsTable.wingId, wingId));
    }

    // Search across fullName, mobile, flatNo
    if (isNonEmptyString(search)) {
      conditions.push(sql`(
        LOWER(${residentsTable.fullName}) LIKE LOWER(${'%' + search + '%'})
        OR ${residentsTable.mobile} LIKE ${'%' + search + '%'}
        OR LOWER(${residentsTable.flatNo}) LIKE LOWER(${'%' + search + '%'})
      )`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(residentsTable)
      .leftJoin(buildingsTable, eq(residentsTable.buildingId, buildingsTable.id))
      .leftJoin(wingsTable, eq(residentsTable.wingId, wingsTable.id))
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Sorting logic
    let orderBy: any;
    if (effectiveSort === "buildingName") {
      orderBy = sortOrder === "asc"
        ? sql`${buildingsTable.buildingName} ASC NULLS LAST`
        : sql`${buildingsTable.buildingName} DESC NULLS LAST`;
    } else if (effectiveSort === "fullName") {
      orderBy = sortOrder === "asc"
        ? sql`LOWER(${residentsTable.fullName}) ASC`
        : sql`LOWER(${residentsTable.fullName}) DESC`;
    } else if (effectiveSort === "flatNo") {
      orderBy = sortOrder === "asc"
        ? sql`${residentsTable.flatNo} ASC`
        : sql`${residentsTable.flatNo} DESC`;
    } else {
      orderBy = sortOrder === "asc"
        ? sql`${residentsTable.createdAt} ASC`
        : sql`${residentsTable.createdAt} DESC`;
    }

    // Fetch residents with building/wing joins
    const rows = await db
      .select({
        id: residentsTable.id,
        fullName: residentsTable.fullName,
        mobile: residentsTable.mobile,
        buildingId: residentsTable.buildingId,
        wingId: residentsTable.wingId,
        flatNo: residentsTable.flatNo,
        address: residentsTable.address,
        status: residentsTable.status,
        createdAt: residentsTable.createdAt,
        updatedAt: residentsTable.updatedAt,
        buildingName: buildingsTable.buildingName,
        wingName: wingsTable.wingName,
      })
      .from(residentsTable)
      .leftJoin(buildingsTable, eq(residentsTable.buildingId, buildingsTable.id))
      .leftJoin(wingsTable, eq(residentsTable.wingId, wingsTable.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const residents = rows.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    res.json({
      residents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch residents" });
  }
});

// ── GET /api/admin/residents/:id ─────────────────────────────────────────────
// Get a single resident with building/wing details

router.get("/admin/residents/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const residentId = parseInt(req.params.id as string, 10);
    if (isNaN(residentId)) {
      res.status(400).json({ error: "Invalid resident ID" });
      return;
    }

    const [row] = await db
      .select({
        id: residentsTable.id,
        fullName: residentsTable.fullName,
        mobile: residentsTable.mobile,
        buildingId: residentsTable.buildingId,
        wingId: residentsTable.wingId,
        flatNo: residentsTable.flatNo,
        address: residentsTable.address,
        status: residentsTable.status,
        createdAt: residentsTable.createdAt,
        updatedAt: residentsTable.updatedAt,
        buildingName: buildingsTable.buildingName,
        wingName: wingsTable.wingName,
      })
      .from(residentsTable)
      .leftJoin(buildingsTable, eq(residentsTable.buildingId, buildingsTable.id))
      .leftJoin(wingsTable, eq(residentsTable.wingId, wingsTable.id))
      .where(eq(residentsTable.id, residentId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Resident not found" });
      return;
    }

    res.json({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch resident" });
  }
});

// ── PATCH /api/admin/residents/:id ───────────────────────────────────────────
// Update a resident

router.patch("/admin/residents/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const residentId = parseInt(req.params.id as string, 10);
    if (isNaN(residentId)) {
      res.status(400).json({ error: "Invalid resident ID" });
      return;
    }

    const body = req.body || {};
    const allowedFields = ["fullName", "mobile", "buildingId", "wingId", "flatNo", "address", "status"] as const;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "fullName" || field === "mobile" || field === "flatNo") {
          if (!isNonEmptyString(body[field])) {
            res.status(400).json({ error: `Field "${field}" cannot be empty` });
            return;
          }
          updateData[field] = body[field].trim();
        } else if (field === "buildingId" || field === "wingId") {
          const val = body[field];
          updateData[field] = (val != null && isPositiveInteger(val)) ? val : null;
        } else if (field === "address") {
          updateData[field] = typeof body[field] === "string" ? body[field].trim() || null : null;
        } else if (field === "status") {
          updateData[field] = body[field] === "inactive" ? "inactive" : "active";
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    // If mobile is being changed, check duplicate
    if (updateData.mobile) {
      const existingMobile = await db
        .select({ id: residentsTable.id })
        .from(residentsTable)
        .where(and(eq(residentsTable.mobile, updateData.mobile as string), sql`${residentsTable.id} != ${residentId}`))
        .limit(1);
      if (existingMobile.length > 0) {
        res.status(409).json({ error: "This mobile number is already registered." });
        return;
      }
    }

    const [updated] = await db
      .update(residentsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(residentsTable.id, residentId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Resident not found" });
      return;
    }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "This mobile number is already registered." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update resident" });
  }
});

// ── DELETE /api/admin/residents/:id ─────────────────────────────────────────
// Delete a resident (check for donation records first)

router.delete("/admin/residents/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const residentId = parseInt(req.params.id as string, 10);
    if (isNaN(residentId)) {
      res.status(400).json({ error: "Invalid resident ID" });
      return;
    }

    // Check if resident exists
    const [resident] = await db
      .select({ id: residentsTable.id, fullName: residentsTable.fullName })
      .from(residentsTable)
      .where(eq(residentsTable.id, residentId))
      .limit(1);

    if (!resident) {
      res.status(404).json({ error: "Resident not found" });
      return;
    }

    // Check for donation records (using the mobile number)
    // We query any existing donations table if it exists
    try {
      const donationsCheck = await db.execute(
        sql`SELECT id FROM donations WHERE donor_name = ${resident.fullName} LIMIT 1`
      );
      if (donationsCheck.rows && donationsCheck.rows.length > 0) {
        res.status(409).json({ error: "This resident has donation records and cannot be deleted." });
        return;
      }
    } catch {
      // Donations table might not exist - proceed
    }

    const [deleted] = await db
      .delete(residentsTable)
      .where(eq(residentsTable.id, residentId))
      .returning({ id: residentsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Resident not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete resident" });
  }
});

export default router;

