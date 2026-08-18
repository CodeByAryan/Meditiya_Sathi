import { Router, type IRouter } from "express";
import { db, tshirtRegistrationsTable, festivalsTable, adminsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function mapCollectionRow(row: any) {
  // Parse raw numeric fields from DB
  const numericSize = row.t_shirt_size_numeric != null ? parseInt(String(row.t_shirt_size_numeric), 10) : null;
  const qty = row.quantity != null ? parseInt(String(row.quantity), 10) : 1;
  const chest = row.chest_size != null ? parseFloat(String(row.chest_size)) : null;
  const price = row.tshirt_price != null ? parseInt(String(row.tshirt_price), 10) : 250;
  const total = row.total_amount != null ? parseInt(String(row.total_amount), 10) : (price * qty);

  return {
    id: row.id,
    collectionId: row.collection_id || null,
    collectionStatus: row.collection_status || "pending",
    collectedAt: row.collected_at?.toISOString?.() || row.collected_at || null,
    collectedByAdminId: row.collected_by_admin_id || null,
    collectedByName: row.collected_by_name || null,
    collectionNotes: row.collection_notes || null,
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
    tShirtSizeNumeric: numericSize,
    quantity: qty,
    tshirtPrice: price,
    totalAmount: total,
    chestSize: chest,
    paidToAdminId: row.paid_to_admin_id,
    paidToName: row.paid_to_name,
    paymentMode: row.payment_mode || "pending",
    pendingReason: row.pending_reason || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}

// ── GET /api/admin/tshirt-collection/summary ───────────────────────────────
// Dashboard stats: total shirts, distributed, pending, %, size-wise breakdown

router.get("/admin/tshirt-collection/summary", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalIdParam = req.query.festivalId as string | undefined;
    const festivalId = festivalIdParam ? parseInt(festivalIdParam, 10) : undefined;

    if (!festivalId) {
      res.status(400).json({ error: "festivalId query parameter is required" });
      return;
    }

    const festivalWhere = `t.festival_id = ${festivalId}`;

    // Overall stats
    const statsResult = await db.execute(
      sql`SELECT
          COUNT(*)::int as totalRegistrations,
          COALESCE(SUM(t.quantity), 0)::int as totalShirts,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.collection_status = 'collected'), 0)::int as collectedShirts,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.collection_status = 'pending'), 0)::int as pendingShirts
          FROM tshirt_registrations t
          WHERE ${sql.raw(festivalWhere)}`
    );
    const stats = (statsResult.rows?.[0] as any) || {};

    // Size-wise breakdown
    const sizeResult = await db.execute(
      sql`SELECT
          t.t_shirt_size as size,
          COALESCE(SUM(t.quantity), 0)::int as total,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.collection_status = 'collected'), 0)::int as collected,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.collection_status = 'pending'), 0)::int as pending
          FROM tshirt_registrations t
          WHERE ${sql.raw(festivalWhere)}
          GROUP BY t.t_shirt_size
          ORDER BY t.t_shirt_size`
    );

    const totalShirts = stats.totalShirts ?? 0;
    const collectedShirts = stats.collectedShirts ?? 0;
    const collectionPercent = totalShirts > 0 ? Math.round((collectedShirts / totalShirts) * 100) : 0;

    res.json({
      totalRegistrations: stats.totalRegistrations ?? 0,
      totalShirts,
      collectedShirts,
      pendingShirts: stats.pendingShirts ?? 0,
      collectionPercent,
      sizeBreakdown: (sizeResult.rows || []).map((s: any) => ({
        size: s.size,
        total: s.total,
        collected: s.collected,
        pending: s.pending,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching tshirt collection summary:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch collection summary" });
  }
});

// ── GET /api/admin/tshirt-collection/search ────────────────────────────────
// Search by collection ID, mobile number, or name (festival-scoped)

router.get("/admin/tshirt-collection/search", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const q = (req.query.q as string)?.trim() || "";
    const festivalIdParam = req.query.festivalId as string | undefined;
    const festivalId = festivalIdParam ? parseInt(festivalIdParam, 10) : undefined;

    if (!festivalId) {
      res.status(400).json({ error: "festivalId query parameter is required" });
      return;
    }

    if (q.length < 1) {
      res.json({ registrations: [] });
      return;
    }

    const safeQ = q.replace(/'/g, "''");
    const whereClause = `t.festival_id = ${festivalId} AND (
      LOWER(t.collection_id) LIKE LOWER('%${safeQ}%')
      OR t.mobile_number LIKE '%${safeQ}%'
      OR LOWER(t.name) LIKE LOWER('%${safeQ}%')
    )`;

    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          WHERE ${sql.raw(whereClause)}
          ORDER BY t.created_at DESC
          LIMIT 20`
    );

    const registrations = (rows.rows || []).map(mapCollectionRow);
    res.json({ registrations });
  } catch (err: any) {
    console.error("Error searching tshirt collection:", err);
    res.status(500).json({ error: err?.message || "Failed to search" });
  }
});

// ── GET /api/admin/tshirt-collection/:collectionId ─────────────────────────
// Lookup a single registration by its collection ID (for verification screen)

const handleGetCollectionById = async (req: any, res: any): Promise<void> => {
  try {
    const { collectionId } = req.params;
    const collectionIdStr = Array.isArray(collectionId) ? collectionId[0] : collectionId;
    if (!collectionIdStr || collectionIdStr.trim().length === 0) {
      res.status(400).json({ error: "Collection ID is required" });
      return;
    }

    const safeId = collectionIdStr.trim().replace(/'/g, "''");

    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          WHERE LOWER(t.collection_id) = LOWER(${safeId})
             OR CAST(t.id AS TEXT) = ${safeId}
          LIMIT 1`
    );

    const row = (rows.rows || [])[0];
    if (!row) {
      res.status(404).json({ error: "Invalid Collection QR / T-Shirt ID", code: "INVALID_QR" });
      return;
    }

    res.json(mapCollectionRow(row));
  } catch (err: any) {
    console.error("Error fetching collection by ID:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch registration" });
  }
};

router.get("/admin/tshirt-collection/:collectionId", requireRole("Super Admin", "Admin", "Volunteer"), handleGetCollectionById);
router.get("/admin/tshirt-collection-cash/:collectionId", requireRole("Super Admin", "Admin", "Volunteer"), handleGetCollectionById);

// ── POST /api/admin/tshirt-collection/:collectionId/collect ────────────────
// SAFE DISTRIBUTION: atomic conditional update prevents double collection

const handleCollectByCollectionId = async (req: any, res: any): Promise<void> => {
  try {
    const { collectionId } = req.params;
    const collectionIdStr = Array.isArray(collectionId) ? collectionId[0] : collectionId;
    const admin = (req as any).admin;
    const body = req.body || {};

    if (!collectionIdStr || collectionIdStr.trim().length === 0) {
      res.status(400).json({ error: "Collection ID is required" });
      return;
    }

    const safeId = collectionIdStr.trim().replace(/'/g, "''");
    const notes = body.collectionNotes?.trim() || null;
    const markPaymentPaid = body.markPaymentPaid === true || body.collectPayment === true;
    const paymentModeOverride = body.paymentMode === "cash" || body.paymentMode === "upi" || body.paymentMode === "online" ? body.paymentMode : (markPaymentPaid ? "cash" : null);

    // Atomic conditional update: only update if collection_status = 'pending'
    const result = await db.execute(
      sql`UPDATE tshirt_registrations
          SET collection_status = 'collected',
              collected_at = NOW(),
              collected_by_admin_id = ${admin?.id || null},
              collected_by_name = ${admin?.fullName || admin?.username || null},
              collection_notes = ${notes},
              ${paymentModeOverride ? sql`payment_mode = ${paymentModeOverride}, pending_reason = NULL,` : sql``}
              updated_at = NOW()
          WHERE (LOWER(collection_id) = LOWER(${safeId}) OR CAST(id AS TEXT) = ${safeId})
            AND collection_status = 'pending'
          RETURNING id, collection_id, collection_status, collected_at,
                    collected_by_admin_id, collected_by_name, collection_notes,
                    payment_mode, pending_reason,
                    name, quantity, t_shirt_size, tshirt_price, total_amount`
    );

    const updated = (result.rows || [])[0] as any;
    if (!updated) {
      // Check if it was already collected
      const rows = await db.execute(
        sql`SELECT id, collection_id, collection_status, collected_at, collected_by_name,
                   name, quantity, t_shirt_size, payment_mode
            FROM tshirt_registrations
            WHERE LOWER(collection_id) = LOWER(${safeId}) OR CAST(id AS TEXT) = ${safeId}
            LIMIT 1`
      );
      const existing = (rows.rows || [])[0] as any;

      if (existing && existing.collection_status === "collected") {
        res.status(409).json({
          error: "This T-Shirt has already been collected.",
          code: "ALREADY_COLLECTED",
          registration: {
            id: existing.id,
            collectionId: existing.collection_id,
            name: existing.name,
            quantity: existing.quantity != null ? parseInt(String(existing.quantity), 10) : 1,
            collectedAt: existing.collected_at?.toISOString?.() || existing.collected_at || null,
            collectedByName: existing.collected_by_name,
            paymentMode: existing.payment_mode,
          },
        });
        return;
      }

      // Not found
      res.status(404).json({ error: "Registration not found", code: "NOT_FOUND" });
      return;
    }

    res.json({
      success: true,
      message: "T-Shirt distribution confirmed successfully",
      registration: {
        id: updated.id,
        collectionId: updated.collection_id,
        collectionStatus: updated.collection_status,
        collectedAt: updated.collected_at?.toISOString?.() || updated.collected_at,
        collectedByAdminId: updated.collected_by_admin_id,
        collectedByName: updated.collected_by_name,
        name: updated.name,
        quantity: updated.quantity != null ? parseInt(String(updated.quantity), 10) : 1,
        tShirtSize: updated.t_shirt_size,
        paymentMode: updated.payment_mode,
        pendingReason: updated.pending_reason,
      },
    });
  } catch (err: any) {
    console.error("Error collecting tshirt:", err);
    res.status(500).json({ error: err?.message || "Failed to process collection" });
  }
};

router.post("/admin/tshirt-collection/:collectionId/collect", requireRole("Super Admin", "Admin", "Volunteer"), handleCollectByCollectionId);
router.post("/admin/tshirt-collection-cash/:collectionId/collect", requireRole("Super Admin", "Admin", "Volunteer"), handleCollectByCollectionId);

// ── GET /api/admin/tshirt-collection/history ───────────────────────────────
// Collection history with filters + search

router.get("/admin/tshirt-collection/history", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const festivalIdParam = req.query.festivalId as string | undefined;
    const festivalId = festivalIdParam ? parseInt(festivalIdParam, 10) : undefined;
    const buildingId = req.query.building as string | undefined;
    const wingId = req.query.wing as string | undefined;
    const size = req.query.size as string | undefined;
    const status = req.query.status as string | undefined; // pending | collected
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const search = (req.query.search as string)?.trim() || "";

    let whereClause = "WHERE 1=1";
    if (festivalId) whereClause += ` AND t.festival_id = ${festivalId}`;
    if (buildingId) whereClause += ` AND t.building_id = ${parseInt(buildingId, 10)}`;
    if (wingId) whereClause += ` AND t.wing_id = ${parseInt(wingId, 10)}`;
    if (size) whereClause += ` AND t.t_shirt_size = '${size.replace(/'/g, "''")}'`;
    if (status) whereClause += ` AND t.collection_status = '${status.replace(/'/g, "''")}'`;
    if (dateFrom) whereClause += ` AND t.collected_at >= '${dateFrom.replace(/'/g, "''")}'`;
    if (dateTo) whereClause += ` AND t.collected_at <= '${dateTo.replace(/'/g, "''")}'::date + interval '1 day'`;
    if (search) {
      const safeSearch = search.replace(/'/g, "''");
      whereClause += ` AND (
        LOWER(t.collection_id) LIKE LOWER('%${safeSearch}%')
        OR LOWER(t.name) LIKE LOWER('%${safeSearch}%')
        OR t.mobile_number LIKE '%${safeSearch}%'
      )`;
    }

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM tshirt_registrations t
          ${sql.raw(whereClause)}`
    );
    const total = (countResult.rows?.[0] as any)?.count ?? 0;

    const rows = await db.execute(
      sql`SELECT t.*, f.name as festival_name, f.year as festival_year,
          b.building_name, w.wing_name
          FROM tshirt_registrations t
          LEFT JOIN festivals f ON t.festival_id = f.id
          LEFT JOIN buildings b ON t.building_id = b.id
          LEFT JOIN wings w ON t.wing_id = w.id
          ${sql.raw(whereClause)}
          ORDER BY t.collected_at DESC NULLS LAST, t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}`
    );

    const registrations = (rows.rows || []).map(mapCollectionRow);

    res.json({
      registrations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("Error fetching collection history:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch collection history" });
  }
});

export default router;
