import { Router, type IRouter } from "express";
import { db, tshirtRegistrationsTable, festivalsTable, adminsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { requireRole, canAccessDonation } from "../middlewares/requireRole";
import { generateTshirtPdf } from "../lib/tshirt-pdf";
import { isCloudinaryConfigured, uploadBufferToCloudinary } from "../lib/cloudinary";
import { getTshirtScannerUrl, getPublicAppBaseUrl } from "../lib/tshirt-url";
import { pdfRateLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const VALID_PRICES = [230, 250];
const VALID_PAYMENT_MODES = ["cash", "upi", "online", "pending"];
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 5;

function isValidTshirtPrice(val: unknown): val is number {
  return typeof val === "number" && VALID_PRICES.includes(val);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isPositiveInteger(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val > 0;
}

function isValidIndianMobile(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const clean = val.trim().replace(/[\s-]/g, "");
  // 10-digit Indian mobile (starting with 6-9)
  return /^[6-9][0-9]{9}$/.test(clean);
}

function isValidChestSize(val: unknown): boolean {
  if (typeof val !== "number") return false;
  return !isNaN(val) && val > 0;
}

/**
 * Normalize empty/blank string values to null so they don't break
 * integer/numeric columns (e.g. wing_id, chest_size). Any other value
 * is returned as-is.
 */
function normalizeNullable(val: unknown): unknown {
  if (val == null) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
}

function isValidQuantity(val: unknown): boolean {
  if (typeof val !== "number") return false;
  return Number.isInteger(val) && val >= MIN_QUANTITY && val <= MAX_QUANTITY;
}

function mapRow(row: any) {
  return {
    id: row.id,
    festivalId: row.festival_id,
    festivalName: row.festival_name,
    festivalYear: row.festival_year,
    name: row.name,
    mobileNumber: row.mobile_number,
    buildingId: row.building_id,
    buildingName: row.building_name,
    wingId: row.wing_id,
    wingName: row.wing_name,
tShirtSize: row.t_shirt_size,
    tShirtSizeNumeric: row.t_shirt_size_numeric != null ? parseInt(String(row.t_shirt_size_numeric), 10) : null,
    quantity: row.quantity != null ? parseInt(String(row.quantity), 10) : 1,
    tshirtPrice: row.tshirt_price != null ? parseInt(String(row.tshirt_price), 10) : 250,
    totalAmount: row.total_amount != null ? parseInt(String(row.total_amount), 10) : 0,
    chestSize: row.chest_size != null ? parseFloat(String(row.chest_size)) : null,
    paidToAdminId: row.paid_to_admin_id,
    paidToName: row.paid_to_name,
paymentMode: row.payment_mode || "pending",
    pendingReason: row.pending_reason || null,
    collectionId: row.collection_id || null,
    collectionStatus: row.collection_status || "pending",
    collectedAt: row.collected_at?.toISOString?.() || row.collected_at || null,
    collectedByAdminId: row.collected_by_admin_id || null,
    collectedByName: row.collected_by_name || null,
    collectionNotes: row.collection_notes || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}

// ── GET /api/admin/tshirt-registrations/summary ─────────────────────────────
// Summary for a festival: total registrations, paid/pending, size breakdown, total quantity

router.get("/admin/tshirt-registrations/summary", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalIdParam = req.query.festivalId as string | undefined;
    const festivalId = festivalIdParam ? parseInt(festivalIdParam, 10) : undefined;

    if (festivalId && isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const festivalCondition = festivalId ? sql`WHERE t.festival_id = ${festivalId}` : sql``;
    const result = await db.execute(
      sql`SELECT
          COUNT(*)::int as total,
          COALESCE(SUM(t.quantity), 0)::int as totalQuantity,
          COALESCE(SUM(t.total_amount), 0)::int as totalAmount,
          COALESCE(SUM(t.total_amount), 0)::int as amountCollected,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.collection_status = 'collected'), 0)::int as distributedTshirts
          FROM tshirt_registrations t
          ${festivalCondition}`
    );
    const row = (result.rows?.[0] as any) || {};

    const totalQuantity = row.totalquantity ?? 0;
    const totalAmount = row.totalamount ?? 0;
    const distributedTshirts = row.distributedtshirts ?? 0;

    res.json({
      totalRegistrations: row.total ?? 0,
      totalQuantity,
      totalTshirtAmount: totalAmount,
      totalAmountCollected: totalAmount,
      distributedTshirts,
      // compatibility aliases for existing consumers
      total: row.total ?? 0,
      totalTshirts: totalQuantity,
      totalAmount: totalAmount,
      amountCollected: totalAmount,
    });
  } catch (err: any) {
    console.error("Error fetching tshirt summary:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch summary" });
  }
});

function buildListQuery(req: any): { whereSql: ReturnType<typeof sql> } {
  const search = (req.query.search as string)?.trim() || "";
  const festivalId = req.query.festival as string | undefined;
  const buildingId = req.query.building as string | undefined;
  const wingId = req.query.wing as string | undefined;
  const size = req.query.size as string | undefined;
  const paymentMode = req.query.payment_mode as string | undefined;
  const paidTo = req.query.paid_to as string | undefined;
  const quantity = req.query.quantity as string | undefined;

  const conditions: ReturnType<typeof sql>[] = [sql`1=1`];

  if (festivalId && isPositiveInteger(parseInt(festivalId, 10))) {
    conditions.push(sql`t.festival_id = ${parseInt(festivalId, 10)}`);
  }
  if (buildingId && isPositiveInteger(parseInt(buildingId, 10))) {
    conditions.push(sql`t.building_id = ${parseInt(buildingId, 10)}`);
  }
  if (wingId && isPositiveInteger(parseInt(wingId, 10))) {
    conditions.push(sql`t.wing_id = ${parseInt(wingId, 10)}`);
  }
  if (size && VALID_SIZES.includes(size)) {
    conditions.push(sql`t.t_shirt_size = ${size}`);
  }
  if (quantity && isPositiveInteger(parseInt(quantity, 10)) && parseInt(quantity, 10) <= MAX_QUANTITY) {
    conditions.push(sql`t.quantity = ${parseInt(quantity, 10)}`);
  }
  if (paymentMode && VALID_PAYMENT_MODES.includes(paymentMode)) {
    conditions.push(sql`t.payment_mode = ${paymentMode}`);
  }
  if (paidTo) {
    const safePaidTo = paidTo.slice(0, 100);
    const searchPattern = `%${safePaidTo}%`;
    conditions.push(sql`(
      t.paid_to_admin_id = ${safePaidTo}
      OR LOWER(COALESCE(t.paid_to_name, '')) LIKE LOWER(${searchPattern})
    )`);
  }
  if (search) {
    const safeSearch = `%${search.slice(0, 100)}%`;
    conditions.push(sql`(
      LOWER(t.name) LIKE LOWER(${safeSearch})
      OR t.mobile_number LIKE ${safeSearch}
      OR LOWER(b.building_name) LIKE LOWER(${safeSearch})
      OR LOWER(COALESCE(w.wing_name, '')) LIKE LOWER(${safeSearch})
      OR LOWER(COALESCE(t.pending_reason, '')) LIKE LOWER(${safeSearch})
      OR LOWER(COALESCE(t.paid_to_name, '')) LIKE LOWER(${safeSearch})
    )`);
  }

  return { whereSql: sql.join(conditions, sql` AND `) };
}

// ── GET /api/admin/tshirt-registrations/export ─────────────────────────────
// Export filtered registrations to CSV (respects the same filters as the list)

router.get("/admin/tshirt-registrations/export", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const { whereSql } = buildListQuery(req);
    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          WHERE ${whereSql}
          ORDER BY t.created_at DESC`
    );

    const headers = [
      "Festival", "Name", "Mobile Number", "Building", "Wing",
"T-Shirt Size", "Numeric Size", "Quantity", "T-Shirt Price", "Total Amount", "Chest Size", "Paid To", "Payment Mode",
      "Collection Status", "Collection ID", "Pending Reason", "Registration Date",
    ];

    const lines = (rows.rows || []).map((row: any) => {
      const vals = [
        `${row.festival_name} ${row.festival_year || ""}`.trim(),
        row.name,
        row.mobile_number,
        row.building_name || "",
        row.wing_name || "",
        row.t_shirt_size,
        row.t_shirt_size_numeric != null ? parseInt(String(row.t_shirt_size_numeric), 10) : "",
        row.quantity != null ? parseInt(String(row.quantity), 10) : 1,
        row.tshirt_price != null ? parseInt(String(row.tshirt_price), 10) : "",
        row.total_amount != null ? parseInt(String(row.total_amount), 10) : "",
        row.chest_size != null ? parseFloat(String(row.chest_size)) : "",
        row.paid_to_name || "",
        (row.payment_mode || "").replace(/^./, (c: string) => c.toUpperCase()),
        row.collection_status || "",
        row.collection_id || "",
        row.pending_reason || "",
        row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN") : "",
      ];
      return vals.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.map(h => `"${h}"`).join(","), ...lines].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=tshirt-registrations.csv");
    res.send(csv);
  } catch (err: any) {
    console.error("Error exporting tshirt registrations:", err);
    res.status(500).json({ error: err?.message || "Failed to export" });
  }
});



// ── GET /api/admin/tshirt-registrations ────────────────────────────────────
// List registrations with filters + pagination

router.get("/admin/tshirt-registrations", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const { whereSql } = buildListQuery(req);

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          WHERE ${whereSql}`
    );
    const total = (countResult.rows?.[0] as any)?.count ?? 0;

    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          WHERE ${whereSql}
          ORDER BY t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}`
    );

    const registrations = (rows.rows || []).map(mapRow);

    res.json({
      registrations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("Error fetching tshirt registrations:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch registrations" });
  }
});

// ── GET /api/admin/tshirt-registrations/:id ────────────────────────────────
// Get a single registration

router.get("/admin/tshirt-registrations/:id", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          WHERE t.id = ${id}
          LIMIT 1`
    );

    const row = (rows.rows || [])[0];
    if (!row) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }

    res.json(mapRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch registration" });
  }
});

// ── POST /api/admin/tshirt-registrations ───────────────────────────────────
// Create a registration (with duplicate check by festival + mobile)

router.post("/admin/tshirt-registrations", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const body = req.body || {};
    const admin = (req as any).admin;

    // Validation
    if (!isPositiveInteger(body.festivalId)) {
      res.status(400).json({ error: "Please select a festival" });
      return;
    }
    if (!isNonEmptyString(body.name)) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (!isValidIndianMobile(body.mobileNumber)) {
      res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
      return;
    }
    if (!isPositiveInteger(body.buildingId)) {
      res.status(400).json({ error: "Please select a building" });
      return;
    }
    if (!VALID_SIZES.includes(body.tShirtSize)) {
      res.status(400).json({ error: "Please select a valid t-shirt size" });
      return;
    }
// Chest size is optional; if provided it must be a valid positive number
    if (body.chestSize != null && body.chestSize !== "" && !isValidChestSize(Number(body.chestSize))) {
      res.status(400).json({ error: "Valid chest size (in inches) is required" });
      return;
    }
    const quantity = body.quantity != null ? body.quantity : 1;
    if (!isValidQuantity(quantity)) {
      res.status(400).json({ error: `Quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}` });
      return;
    }
    const tshirtPrice = body.tshirtPrice != null ? body.tshirtPrice : 250;
    if (!isValidTshirtPrice(tshirtPrice)) {
      res.status(400).json({ error: "Please select a valid t-shirt price" });
      return;
    }
    // Numeric t-shirt size is optional; if provided it must be a positive integer
    const tShirtSizeNumeric = body.tShirtSizeNumeric != null && body.tShirtSizeNumeric !== "" ? parseInt(String(body.tShirtSizeNumeric), 10) : null;
    if (tShirtSizeNumeric !== null && !isPositiveInteger(tShirtSizeNumeric)) {
      res.status(400).json({ error: "Valid numeric t-shirt size is required" });
      return;
    }

    const paymentMode = body.paymentMode || "pending";
    if (!VALID_PAYMENT_MODES.includes(paymentMode)) {
      res.status(400).json({ error: "Invalid payment mode" });
      return;
    }

    // Verify festival exists
    const [festival] = await db
      .select({ id: festivalsTable.id })
      .from(festivalsTable)
      .where(eq(festivalsTable.id, body.festivalId))
      .limit(1);
    if (!festival) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

// Allow duplicate registrations (a resident may register multiple entries)
    const mobileNumber = body.mobileNumber.trim().replace(/[\s-]/g, "");

    // Fetch the festival year for collection ID generation (e.g. TSH-2026-0001)
    let festivalYear: number | null = null;
    try {
      const [fRow] = await db
        .select({ year: festivalsTable.year })
        .from(festivalsTable)
        .where(eq(festivalsTable.id, body.festivalId))
        .limit(1);
      festivalYear = fRow?.year ?? null;
    } catch { /* ignore */ }

    // Resolve wingId (must belong to selected building)
    let wingId: number | null = null;
    if (body.wingId != null && isPositiveInteger(body.wingId)) {
      wingId = body.wingId;
    }

    // Resolve "Paid To" admin name from the selected admin id (fallback to logged-in admin)
    let paidToAdminId: string | null = body.paidToAdminId?.trim() || admin?.id || null;
    let paidToName: string | null = body.paidToName?.trim() || admin?.fullName || admin?.username || null;
    if (paidToAdminId) {
      const [paidToAdmin] = await db
        .select({ fullName: adminsTable.fullName })
        .from(adminsTable)
        .where(eq(adminsTable.id, paidToAdminId))
        .limit(1);
      if (paidToAdmin) {
        paidToAdminId = paidToAdminId;
        paidToName = paidToAdmin.fullName;
      }
    }

    const totalAmount = tshirtPrice * quantity;
    const [registration] = await db
      .insert(tshirtRegistrationsTable)
      .values({
        festivalId: body.festivalId,
        name: body.name.trim(),
        mobileNumber,
        buildingId: body.buildingId,
        wingId: normalizeNullable(wingId) as number | null,
        tShirtSize: body.tShirtSize,
        tShirtSizeNumeric: normalizeNullable(tShirtSizeNumeric) as number | null,
        quantity,
        tshirtPrice,
        totalAmount,
        chestSize: normalizeNullable(body.chestSize != null && body.chestSize !== "" ? String(body.chestSize) : null) as string | null,
        paidToAdminId: normalizeNullable(paidToAdminId) as string | null,
        paidToName: normalizeNullable(paidToName) as string | null,
        paymentMode,
        pendingReason: paymentMode === "pending" ? normalizeNullable(body.pendingReason?.trim()) as string | null : null,
      })
      .returning();

    let collectionId: string | null = null;
    let collectionStatus = "pending";
    if (registration?.id != null) {
      const year = festivalYear ?? new Date().getFullYear();
      collectionId = `TSH-${year}-${String(registration.id).padStart(4, "0")}`;
      try {
        await db.execute(
          sql`UPDATE tshirt_registrations
              SET collection_id = ${collectionId}
              WHERE id = ${registration.id}`
        );
      } catch (updErr: any) {
        console.error("Error setting collection_id:", updErr?.message);
      }
    }

    res.status(201).json({
      id: registration.id,
      festivalId: registration.festivalId,
      name: registration.name,
      mobileNumber: registration.mobileNumber,
      buildingId: registration.buildingId,
      wingId: registration.wingId,
      tShirtSize: registration.tShirtSize,
      tShirtSizeNumeric: registration.tShirtSizeNumeric != null ? parseInt(String(registration.tShirtSizeNumeric), 10) : null,
      quantity: registration.quantity != null ? parseInt(String(registration.quantity), 10) : 1,
      tshirtPrice: registration.tshirtPrice != null ? parseInt(String(registration.tshirtPrice), 10) : 250,
      totalAmount: registration.totalAmount != null ? parseInt(String(registration.totalAmount), 10) : 0,
      chestSize: registration.chestSize != null ? parseFloat(String(registration.chestSize)) : null,
      paidToAdminId: registration.paidToAdminId,
      paidToName: registration.paidToName,
      paymentMode: registration.paymentMode,
      pendingReason: registration.pendingReason || null,
      collectionId,
      collectionStatus,
      collectedAt: null,
      collectedByAdminId: null,
      collectedByName: null,
      collectionNotes: null,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    });
} catch (err: any) {
    console.error("Error creating tshirt registration:", err);
    res.status(500).json({ error: err?.message || "Failed to create registration" });
  }
});

// ── PATCH /api/admin/tshirt-registrations/:id ──────────────────────────────
// Update a registration (Volunteer can update own only)

router.patch("/admin/tshirt-registrations/:id", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const admin = (req as any).admin;
    const body = req.body || {};

    // Volunteers can only edit their own registrations
    if (admin.role === "Volunteer") {
      const [existing] = await db
        .select({ paidToAdminId: tshirtRegistrationsTable.paidToAdminId })
        .from(tshirtRegistrationsTable)
        .where(eq(tshirtRegistrationsTable.id, id))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "Registration not found" });
        return;
      }
      if (!(await canAccessDonation(admin.role, admin.id, existing.paidToAdminId))) {
        res.status(403).json({ error: "You can only edit registrations you created" });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!isNonEmptyString(body.name)) {
        res.status(400).json({ error: "Name cannot be empty" });
        return;
      }
      updateData.name = body.name.trim();
    }

    if (body.mobileNumber !== undefined) {
      if (!isValidIndianMobile(body.mobileNumber)) {
        res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
        return;
      }
      updateData.mobileNumber = body.mobileNumber.trim().replace(/[\s-]/g, "");
    }

    if (body.buildingId !== undefined) {
      if (!isPositiveInteger(body.buildingId)) {
        res.status(400).json({ error: "Please select a building" });
        return;
      }
      updateData.buildingId = body.buildingId;
    }

if (body.wingId !== undefined) {
      const wingVal = normalizeNullable(body.wingId);
      updateData.wingId = (wingVal != null && isPositiveInteger(wingVal)) ? wingVal : null;
    }

if (body.tShirtSize !== undefined) {
      if (!VALID_SIZES.includes(body.tShirtSize)) {
        res.status(400).json({ error: "Please select a valid t-shirt size" });
        return;
      }
      updateData.tShirtSize = body.tShirtSize;
    }

    if (body.tShirtSizeNumeric !== undefined) {
      // Numeric size is optional; null/empty clears it, otherwise must be a positive integer
      if (body.tShirtSizeNumeric == null || body.tShirtSizeNumeric === "") {
        updateData.tShirtSizeNumeric = null;
      } else {
        const num = parseInt(String(body.tShirtSizeNumeric), 10);
        if (!isPositiveInteger(num)) {
          res.status(400).json({ error: "Valid numeric t-shirt size is required" });
          return;
        }
        updateData.tShirtSizeNumeric = num;
      }
    }

    if (body.quantity !== undefined) {
      if (!isValidQuantity(body.quantity)) {
        res.status(400).json({ error: `Quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}` });
        return;
      }
      updateData.quantity = body.quantity;
    }

    if (body.tshirtPrice !== undefined) {
      if (!isValidTshirtPrice(body.tshirtPrice)) {
        res.status(400).json({ error: "Please select a valid t-shirt price" });
        return;
      }
      updateData.tshirtPrice = body.tshirtPrice;
    }

if (body.chestSize !== undefined) {
      // Chest size is optional; null/empty clears it, otherwise must be a valid positive number
      if (body.chestSize == null || body.chestSize === "") {
        updateData.chestSize = null;
      } else {
        if (!isValidChestSize(Number(body.chestSize))) {
          res.status(400).json({ error: "Valid chest size (in inches) is required" });
          return;
        }
        updateData.chestSize = String(Number(body.chestSize));
      }
    }

    if (body.paymentMode !== undefined) {
      if (!VALID_PAYMENT_MODES.includes(body.paymentMode)) {
        res.status(400).json({ error: "Invalid payment mode" });
        return;
      }
      updateData.paymentMode = body.paymentMode;
      // When mode changes away from pending, clear pending reason
      if (body.paymentMode !== "pending") {
        updateData.pendingReason = null;
      }
    }

    if (body.pendingReason !== undefined) {
      updateData.pendingReason = body.pendingReason?.trim() || null;
    }

    if (body.paidToAdminId !== undefined) {
      updateData.paidToAdminId = body.paidToAdminId?.trim() || null;
    }
    if (body.paidToName !== undefined) {
      updateData.paidToName = body.paidToName?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    if (updateData.tshirtPrice !== undefined || updateData.quantity !== undefined) {
      const existingRow = await db.execute(
        sql`SELECT quantity, tshirt_price FROM tshirt_registrations WHERE id = ${id} LIMIT 1`
      );
      const existing = (existingRow.rows?.[0] as any) || {};
      const newPrice = updateData.tshirtPrice !== undefined
        ? Number(updateData.tshirtPrice)
        : Number(existing.tshirt_price ?? 250);
      const newQuantity = updateData.quantity !== undefined
        ? Number(updateData.quantity)
        : Number(existing.quantity ?? 1);
      updateData.totalAmount = newPrice * newQuantity;
    }

    const [updated] = await db
      .update(tshirtRegistrationsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(tshirtRegistrationsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }

    res.json({
      ...updated,
      tShirtSizeNumeric: updated.tShirtSizeNumeric != null ? parseInt(String(updated.tShirtSizeNumeric), 10) : null,
      quantity: updated.quantity != null ? parseInt(String(updated.quantity), 10) : 1,
      tshirtPrice: updated.tshirtPrice != null ? parseInt(String(updated.tshirtPrice), 10) : 250,
      totalAmount: updated.totalAmount != null ? parseInt(String(updated.totalAmount), 10) : 0,
      chestSize: updated.chestSize != null ? parseFloat(String(updated.chestSize)) : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update registration" });
  }
});

// ── Public Application Base URL Helper ────────────────────────────────────

function getPublicAppUrl(req?: any): string {
  // 1. Check explicit environment variables
  const envUrl =
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    process.env.WEB_APP_URL ||
    process.env.FRONTEND_URL;

  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (!trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
      return trimmed;
    }
  }

  // 2. Check if request came from a deployed non-localhost origin or referer
  if (req?.headers) {
    const origin = req.headers.origin ? String(req.headers.origin).trim().replace(/\/+$/, "") : null;
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.includes(":8080")) {
      return origin;
    }
    const referer = req.headers.referer ? String(req.headers.referer).trim() : null;
    if (referer) {
      try {
        const refOrigin = new URL(referer).origin.replace(/\/+$/, "");
        if (!refOrigin.includes("localhost") && !refOrigin.includes("127.0.0.1") && !refOrigin.includes(":8080")) {
          return refOrigin;
        }
      } catch {}
    }
  }

  // 3. Fallback to production deployed domain (never localhost for public QR/PDF)
  return "https://meditiya-sathi.vercel.app";
}

// ── GET /api/admin/tshirt-registrations/:id/qr ─────────────────────────────
// Generate a QR code image (PNG) encoding the registration's collection ID.

router.get("/admin/tshirt-registrations/:id/qr", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

const rows = await db.execute(
      sql`SELECT t.id, t.collection_id, t.name, t.quantity, t.t_shirt_size,
          f.name as festival_name, f.year as festival_year
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          WHERE t.id = ${id}
          LIMIT 1`
    );
    const row = (rows.rows || [])[0] as any;
    if (!row) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }

    let collectionId = row.collection_id;
    if (!collectionId) {
      const year = row.festival_year || new Date().getFullYear();
      collectionId = `TSH-${year}-${String(row.id).padStart(4, "0")}`;
      try {
        await db.execute(
          sql`UPDATE tshirt_registrations SET collection_id = ${collectionId} WHERE id = ${row.id}`
        );
      } catch { /* ignore */ }
    }

    // Encode canonical scanner URL (identical across website, PDF QR, and WhatsApp)
    const payload = getTshirtScannerUrl(collectionId);

    const dataUrl = await QRCode.toDataURL(payload, { width: 512, margin: 2, errorCorrectionLevel: "H" });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

    res.json({
      qrDataUrl: dataUrl,
      qrBase64: base64,
      collectionId,
      payload,
      registration: {
        id: row.id,
        name: row.name,
        quantity: row.quantity != null ? parseInt(String(row.quantity), 10) : 1,
        tShirtSize: row.t_shirt_size,
        festivalName: row.festival_name,
        festivalYear: row.festival_year,
      },
    });
  } catch (err: any) {
    console.error("Error generating tshirt QR:", err);
    res.status(500).json({ error: err?.message || "Failed to generate QR" });
  }
});

// ── DELETE /api/admin/tshirt-registrations/:id ─────────────────────────────
// Delete a registration (Super Admin + Admin only, mirrors destructive-action pattern)

router.delete("/admin/tshirt-registrations/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const [deleted] = await db
      .delete(tshirtRegistrationsTable)
      .where(eq(tshirtRegistrationsTable.id, id))
      .returning({ id: tshirtRegistrationsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete registration" });
  }
});

// ── POST /api/admin/tshirt-registrations/:id/pdf ───────────────────────────
// Generate and store personalized T-shirt PDF (with embedded QR code)

router.post("/admin/tshirt-registrations/:id/pdf", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name,
          r.flat_no as flat_number
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          LEFT JOIN residents r ON r.mobile = t.mobile_number
          WHERE t.id = ${id}
          LIMIT 1`
    );

    const row = (rows.rows || [])[0] as any;
    if (!row) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }

    let collectionId = row.collection_id;
    if (!collectionId) {
      const year = row.festival_year || new Date().getFullYear();
      collectionId = `TSH-${year}-${String(row.id).padStart(4, "0")}`;
      try {
        await db.execute(
          sql`UPDATE tshirt_registrations SET collection_id = ${collectionId} WHERE id = ${row.id}`
        );
      } catch { /* ignore */ }
    }

    // Canonical scanner URL encoded into the QR inside the PDF
    const qrPayload = getTshirtScannerUrl(collectionId);
    const baseUrl = getPublicAppBaseUrl();

    const pdfBuffer = await generateTshirtPdf({
      id: row.id,
      collectionId,
      name: row.name,
      mobileNumber: row.mobile_number,
      buildingName: row.building_name,
      wingName: row.wing_name,
      flatNumber: row.flat_number || null,
      tShirtSize: row.t_shirt_size,
      tShirtSizeNumeric: row.t_shirt_size_numeric != null ? parseInt(String(row.t_shirt_size_numeric), 10) : null,
      quantity: row.quantity != null ? parseInt(String(row.quantity), 10) : 1,
      tshirtPrice: row.tshirt_price != null ? parseInt(String(row.tshirt_price), 10) : 250,
      totalAmount: row.total_amount != null ? parseInt(String(row.total_amount), 10) : 0,
      festivalName: row.festival_name,
      festivalYear: row.festival_year,
      createdAt: row.created_at,
      qrPayload,
    });

    // Optional Cloudinary backup upload
    let cloudinaryUrl: string | null = null;
    if (isCloudinaryConfigured) {
      try {
        const uploadRes = await uploadBufferToCloudinary(pdfBuffer, "meditiya-sathi/tshirts", {
          resource_type: "raw",
          public_id: `Meditiya-Sathi-Tshirt-${collectionId}.pdf`,
          format: "pdf",
        });
        cloudinaryUrl = uploadRes.secure_url;
      } catch (uploadErr: any) {
        console.warn("Cloudinary upload fallback:", uploadErr?.message);
      }
    }

    // Direct public PDF serving URL (guaranteed 100% accessible to recipients in browser without Cloudinary ACL blocks)
    const publicPdfUrl = `${baseUrl}/api/tshirt-pdf/${encodeURIComponent(collectionId)}.pdf`;

    res.json({
      success: true,
      pdfUrl: publicPdfUrl,
      downloadUrl: publicPdfUrl,
      cloudinaryUrl,
      tshirtId: collectionId,
      filename: `Meditiya-Sathi-Tshirt-${collectionId}.pdf`,
      registration: {
        id: row.id,
        name: row.name,
        mobileNumber: row.mobile_number,
        tShirtSize: row.t_shirt_size,
        quantity: row.quantity != null ? parseInt(String(row.quantity), 10) : 1,
        buildingName: row.building_name,
        wingName: row.wing_name,
        flatNumber: row.flat_number || null,
      },
    });
  } catch (err: any) {
    console.error("Error generating tshirt PDF:", err);
    res.status(500).json({ error: err?.message || "Failed to generate PDF" });
  }
});

// ── Public GET /api/tshirt-pdf/:collectionId ──────────────────────────────
// Completely public endpoint for residents opening their T-shirt collection PDF pass from WhatsApp

const handleServePublicTshirtPdf = async (req: any, res: any): Promise<void> => {
  try {
    const rawParam = (req.params.collectionId || req.params.id || "").trim();
    if (!rawParam) {
      res.status(400).setHeader("Content-Type", "text/plain").send("Collection ID is required");
      return;
    }

    // Strip .pdf extension if present in param
    const cleanId = rawParam.replace(/\.pdf$/i, "").trim();
    const safeId = cleanId.replace(/'/g, "''");

    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name,
          r.flat_no as flat_number
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          LEFT JOIN residents r ON r.mobile = t.mobile_number
          WHERE LOWER(t.collection_id) = LOWER(${safeId})
             OR CAST(t.id AS TEXT) = ${safeId}
          LIMIT 1`
    );

    const row = (rows.rows || [])[0] as any;
    if (!row) {
      res.status(404).setHeader("Content-Type", "text/plain").send("T-Shirt Registration Pass Not Found");
      return;
    }

    let collectionId = row.collection_id;
    if (!collectionId) {
      const year = row.festival_year || new Date().getFullYear();
      collectionId = `TSH-${year}-${String(row.id).padStart(4, "0")}`;
    }

    // Canonical scanner URL encoded into the QR inside the PDF
    const qrPayload = getTshirtScannerUrl(collectionId);

    const pdfBuffer = await generateTshirtPdf({
      id: row.id,
      collectionId,
      name: row.name,
      mobileNumber: row.mobile_number,
      buildingName: row.building_name,
      wingName: row.wing_name,
      flatNumber: row.flat_number || null,
      tShirtSize: row.t_shirt_size,
      tShirtSizeNumeric: row.t_shirt_size_numeric != null ? parseInt(String(row.t_shirt_size_numeric), 10) : null,
      quantity: row.quantity != null ? parseInt(String(row.quantity), 10) : 1,
      tshirtPrice: row.tshirt_price != null ? parseInt(String(row.tshirt_price), 10) : 250,
      totalAmount: row.total_amount != null ? parseInt(String(row.total_amount), 10) : 0,
      festivalName: row.festival_name,
      festivalYear: row.festival_year,
      createdAt: row.created_at,
      qrPayload,
    });

    const filename = `Meditiya-Sathi-Tshirt-${collectionId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(pdfBuffer);
  } catch (err: any) {
    console.error("Error serving public tshirt PDF:", err);
    res.status(500).setHeader("Content-Type", "text/plain").send("Failed to generate PDF pass");
  }
};

router.get("/tshirt-pdf/:collectionId", pdfRateLimiter, handleServePublicTshirtPdf);
router.get("/admin/tshirt-registrations/:id/pdf/download", requireRole("Super Admin", "Admin", "Volunteer"), handleServePublicTshirtPdf);

export default router;
