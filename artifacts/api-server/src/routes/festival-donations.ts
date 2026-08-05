import { Router, type IRouter } from "express";
import { db, festivalDonationsTable, festivalsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireRole, canAccessFestival, canAccessDonation } from "../middlewares/requireRole";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isPositiveFloat(val: unknown): val is number {
  return typeof val === "number" && !isNaN(val) && val >= 0;
}

function isPositiveInteger(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val > 0;
}

// ── Generate receipt number via SQL function ───────────────────────────────
async function generateReceiptNumber(festivalId: number): Promise<string> {
  try {
    const result = await db.execute(
      sql`SELECT generate_receipt_number(${festivalId}) as receipt`
    );
    return (result.rows?.[0] as any)?.receipt || `RCP-${festivalId}-${Date.now()}`;
  } catch {
    const ts = Date.now().toString(36).toUpperCase();
    return `TMP-${festivalId}-${ts}`;
  }
}

// ── GET /api/admin/festivals/:festivalId/donations ─────────────────────────
// List donations for a festival with resident details, filters, sorting

router.get("/admin/festivals/:festivalId/donations", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const admin = (req as any).admin;
    if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
      res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || "";
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

    // Filter parameters
    const paymentMethodFilter = req.query.paymentMethod as string | undefined;
    const buildingIdParam = req.query.buildingId as string | undefined;
    const wingIdParam = req.query.wingId as string | undefined;
    const flatNo = req.query.flatNo as string | undefined;
    const adminId = req.query.adminId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const amountMin = req.query.amountMin as string | undefined;
    const amountMax = req.query.amountMax as string | undefined;
    const donationStatus = req.query.donationStatus as string | undefined;
    const pendingReasonFilter = req.query.pendingReason as string | undefined;

    // Build WHERE conditions
    let whereClause = `WHERE fd.festival_id = ${festivalId}`;

    if (paymentMethodFilter && ["pending", "cash", "upi", "bank_transfer", "cheque"].includes(paymentMethodFilter)) {
      whereClause += ` AND fd.payment_method = '${paymentMethodFilter.replace(/'/g, "''")}'`;
    }

    // Donation Status filter (paid = any non-pending method, pending = 'pending')
    if (donationStatus === "paid") {
      whereClause += ` AND fd.payment_method != 'pending'`;
    } else if (donationStatus === "pending") {
      whereClause += ` AND fd.payment_method = 'pending'`;
    }

    // Pending Reason filter
    if (pendingReasonFilter) {
      const safeReason = pendingReasonFilter.replace(/'/g, "''");
      whereClause += ` AND fd.pending_reason = '${safeReason}'`;
    }

    if (search) {
      const safeSearch = search.replace(/'/g, "''");
      whereClause += ` AND (LOWER(r.full_name) LIKE LOWER('%${safeSearch}%')
        OR r.mobile LIKE '%${safeSearch}%'
        OR LOWER(r.flat_no) LIKE LOWER('%${safeSearch}%')
        OR LOWER(b.building_name) LIKE LOWER('%${safeSearch}%')
        OR LOWER(COALESCE(w.wing_name, '')) LIKE LOWER('%${safeSearch}%')
        OR LOWER(COALESCE(fd.receipt_number, '')) LIKE LOWER('%${safeSearch}%')
        OR LOWER(COALESCE(fd.notes, '')) LIKE LOWER('%${safeSearch}%')
        OR LOWER(fd.collected_by_admin_name) LIKE LOWER('%${safeSearch}%'))`;
    }

    if (buildingIdParam) {
      const bid = parseInt(buildingIdParam, 10);
      if (!isNaN(bid)) whereClause += ` AND r.building_id = ${bid}`;
    }

    if (wingIdParam) {
      const wid = parseInt(wingIdParam, 10);
      if (!isNaN(wid)) whereClause += ` AND r.wing_id = ${wid}`;
    }

    if (flatNo) {
      const safeFlat = flatNo.replace(/'/g, "''");
      whereClause += ` AND LOWER(r.flat_no) = LOWER('${safeFlat}')`;
    }

    if (adminId) {
      const safeAdmin = adminId.replace(/'/g, "''");
      whereClause += ` AND fd.collected_by_admin_id = '${safeAdmin}'`;
    }

    if (dateFrom) whereClause += ` AND fd.payment_date >= '${dateFrom.replace(/'/g, "''")}'`;
    if (dateTo) whereClause += ` AND fd.payment_date <= '${dateTo.replace(/'/g, "''")}'`;

    if (amountMin) {
      const amt = parseFloat(amountMin);
      if (!isNaN(amt)) whereClause += ` AND fd.amount >= ${amt}`;
    }
    if (amountMax) {
      const amt = parseFloat(amountMax);
      if (!isNaN(amt)) whereClause += ` AND fd.amount <= ${amt}`;
    }

    // Count total
    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM festival_donations fd
          LEFT JOIN residents r ON fd.resident_id = r.id
          LEFT JOIN buildings b ON r.building_id = b.id
          LEFT JOIN wings w ON r.wing_id = w.id
          ${sql.raw(whereClause)}`
    );
    const total = (countResult.rows?.[0] as any)?.count ?? 0;

    // Determine sort
    const sortMap: Record<string, string> = {
      amount: `fd.amount ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      paymentDate: `fd.payment_date ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      residentName: `r.full_name ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      building: `b.building_name ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      wing: `w.wing_name ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      flatNo: `r.flat_no ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      paymentMethod: `fd.payment_method ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      receiptNumber: `fd.receipt_number ${sortOrder === "asc" ? "ASC" : "DESC"}`,
      createdAt: `fd.created_at ${sortOrder === "asc" ? "ASC" : "DESC"}`,
    };
    const orderClause = sortMap[sortBy] || "fd.created_at DESC";

    // Fetch donations with resident details
    const rows = await db.execute(
      sql`SELECT fd.*, r.full_name as resident_name, r.mobile as resident_mobile,
          r.flat_no, r.building_id, r.wing_id,
          b.building_name, w.wing_name
          FROM festival_donations fd
          LEFT JOIN residents r ON fd.resident_id = r.id
          LEFT JOIN buildings b ON r.building_id = b.id
          LEFT JOIN wings w ON r.wing_id = w.id
          ${sql.raw(whereClause)}
          ORDER BY ${sql.raw(orderClause)}
          LIMIT ${limit} OFFSET ${offset}`
    );

    const donations = (rows.rows || []).map((row: any) => ({
      id: row.id,
      festivalId: row.festival_id,
      residentId: row.resident_id,
      paymentMethod: row.payment_method || "pending",
      amount: row.amount ? parseFloat(String(row.amount)) : null,
      paymentDate: row.payment_date,
      receiptNumber: row.receipt_number,
      receiptGeneratedAt: row.receipt_generated_at?.toISOString?.() || row.receipt_generated_at,
      pendingReason: row.pending_reason || null,
      notes: row.notes,
      collectedByAdminId: row.collected_by_admin_id,
      collectedByAdminName: row.collected_by_admin_name,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
      residentName: row.resident_name,
      residentMobile: row.resident_mobile,
      flatNo: row.flat_no,
      buildingName: row.building_name,
      wingName: row.wing_name,
    }));

    res.json({
      donations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("Error fetching festival donations:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch donations" });
  }
});

// ── POST /api/admin/festivals/:festivalId/donations ─────────────────────────
// Create a donation (auto-collect admin info from token, auto-generate receipt for non-pending)

router.post("/admin/festivals/:festivalId/donations", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    // Verify festival exists
    const [festival] = await db
      .select({ id: festivalsTable.id })
      .from(festivalsTable)
      .where(eq(festivalsTable.id, festivalId))
      .limit(1);

    if (!festival) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

    const body = req.body || {};
    const admin = (req as any).admin;

    // Volunteers can only add donations to festivals assigned to them
    if (admin.role === "Volunteer") {
      if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
        res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
        return;
      }
    }

    // Validation
    if (!isPositiveInteger(body.residentId)) {
      res.status(400).json({ error: "Please select a resident" });
      return;
    }

    const paymentMethod = body.paymentMethod || "pending";
    const validMethods = ["pending", "cash", "upi", "bank_transfer", "cheque"];
    if (!validMethods.includes(paymentMethod)) {
      res.status(400).json({ error: "Invalid payment method" });
      return;
    }

    const isPaid = paymentMethod !== "pending";

    if (isPaid) {
      if (!isPositiveFloat(body.amount)) {
        res.status(400).json({ error: "Valid donation amount is required" });
        return;
      }
    }

    // Check for existing donation for same resident+festival
    const existing = await db
      .select({ id: festivalDonationsTable.id })
      .from(festivalDonationsTable)
      .where(and(
        eq(festivalDonationsTable.festivalId, festivalId),
        eq(festivalDonationsTable.residentId, body.residentId),
      ))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        error: "This resident already has a donation record for this festival.",
        existingDonationId: existing[0].id,
      });
      return;
    }

    // Generate receipt number for paid donations
    let receiptNumber: string | null = null;
    let receiptGeneratedAt: Date | null = null;
    if (isPaid) {
      receiptNumber = await generateReceiptNumber(festivalId);
      receiptGeneratedAt = new Date();
    }

    const [donation] = await db
      .insert(festivalDonationsTable)
      .values({
        festivalId,
        residentId: body.residentId,
        paymentMethod,
        amount: isPaid ? String(body.amount) : null,
        paymentDate: isPaid ? (body.paymentDate || new Date().toISOString().split("T")[0]) : null,
        receiptNumber,
        receiptGeneratedAt,
        pendingReason: !isPaid && body.pendingReason ? body.pendingReason.trim() : null,
        notes: body.notes?.trim() || null,
        collectedByAdminId: admin?.id || "unknown",
        collectedByAdminName: admin?.fullName || admin?.username || "Unknown Admin",
      })
      .returning();

    res.status(201).json({
      ...donation,
      amount: donation.amount ? parseFloat(String(donation.amount)) : null,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "This resident already has a record for this festival." });
      return;
    }
    console.error("Error creating donation:", err);
    res.status(500).json({ error: err?.message || "Failed to create donation" });
  }
});

// ── PATCH /api/admin/festivals/:festivalId/donations/:id ────────────────────
// Update a donation (supports pending→paid transition)
// Super Admin and Admin can edit all donations
// Volunteer can only edit donations they collected

router.patch("/admin/festivals/:festivalId/donations/:id", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    const donationId = parseInt(req.params.id as string, 10);
    const admin = (req as any).admin;

    if (isNaN(festivalId) || isNaN(donationId)) {
      res.status(400).json({ error: "Invalid parameters" });
      return;
    }

    // Volunteers can only edit their own donations
    if (admin.role === "Volunteer") {
      const [existingDonation] = await db
        .select({ collectedByAdminId: festivalDonationsTable.collectedByAdminId })
        .from(festivalDonationsTable)
        .where(and(
          eq(festivalDonationsTable.id, donationId),
          eq(festivalDonationsTable.festivalId, festivalId),
        ))
        .limit(1);

      if (!existingDonation) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      if (!(await canAccessDonation(admin.role, admin.id, existingDonation.collectedByAdminId))) {
        res.status(403).json({ error: "You can only edit donations you collected" });
        return;
      }
    }

    const body = req.body || {};
    const updateData: Record<string, unknown> = {};

    // If payment method is being updated
    if (body.paymentMethod) {
      const validMethods = ["pending", "cash", "upi", "bank_transfer", "cheque"];
      if (!validMethods.includes(body.paymentMethod)) {
        res.status(400).json({ error: "Invalid payment method" });
        return;
      }

      const newMethod = body.paymentMethod;
      updateData.paymentMethod = newMethod;

      const becomingPaid = newMethod !== "pending";

      if (becomingPaid) {
        // Check if was previously pending — generate receipt
        const [current] = await db
          .select({ paymentMethod: festivalDonationsTable.paymentMethod })
          .from(festivalDonationsTable)
          .where(and(
            eq(festivalDonationsTable.id, donationId),
            eq(festivalDonationsTable.festivalId, festivalId),
          ))
          .limit(1);

        if (current && current.paymentMethod === "pending") {
          const receiptNumber = await generateReceiptNumber(festivalId);
          updateData.receiptNumber = receiptNumber;
          updateData.receiptGeneratedAt = new Date();
        }

        if (isPositiveFloat(body.amount)) {
          updateData.amount = String(body.amount);
        } else if (!body.amount && !current) {
          res.status(400).json({ error: "Amount is required for paid donations" });
          return;
        }
        if (body.paymentDate) {
          updateData.paymentDate = body.paymentDate;
        } else if (!current) {
          updateData.paymentDate = new Date().toISOString().split("T")[0];
        }
        // Clear pendingReason when transitioning to paid
        updateData.pendingReason = null;
      } else {
        // Changing to pending — clear payment details
        updateData.amount = null;
        updateData.paymentDate = null;
        updateData.receiptNumber = null;
        updateData.receiptGeneratedAt = null;
      }
    } else {
      // Handle field updates without changing payment method
      if (body.amount !== undefined) {
        if (!isPositiveFloat(body.amount)) {
          res.status(400).json({ error: "Valid amount is required" });
          return;
        }
        updateData.amount = String(body.amount);
      }

      if (body.paymentDate !== undefined) {
        updateData.paymentDate = body.paymentDate;
      }

      if (body.notes !== undefined) {
        updateData.notes = body.notes?.trim() || null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(festivalDonationsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(festivalDonationsTable.id, donationId),
        eq(festivalDonationsTable.festivalId, festivalId),
      ))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Donation not found" });
      return;
    }

    res.json({
      ...updated,
      amount: updated.amount ? parseFloat(String(updated.amount)) : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update donation" });
  }
});

// ── DELETE /api/admin/festivals/:festivalId/donations/:id ───────────────────
// Delete a donation

router.delete("/admin/festivals/:festivalId/donations/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    const donationId = parseInt(req.params.id as string, 10);

    if (isNaN(festivalId) || isNaN(donationId)) {
      res.status(400).json({ error: "Invalid parameters" });
      return;
    }

    const [deleted] = await db
      .delete(festivalDonationsTable)
      .where(and(
        eq(festivalDonationsTable.id, donationId),
        eq(festivalDonationsTable.festivalId, festivalId),
      ))
      .returning({ id: festivalDonationsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Donation not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete donation" });
  }
});

// ── GET /api/admin/festivals/:festivalId/stats ──────────────────────────────
// Get festival statistics

router.get("/admin/festivals/:festivalId/stats", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const admin = (req as any).admin;
    // Volunteers can only view stats of festivals assigned to them
    if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
      res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
      return;
    }

    const [festival] = await db
      .select()
      .from(festivalsTable)
      .where(eq(festivalsTable.id, festivalId))
      .limit(1);

    if (!festival) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

const totalResult = await db.execute(
      sql`SELECT
          COALESCE(SUM(amount::numeric), 0) as total,
          COUNT(*)::int as count,
          COALESCE(AVG(amount::numeric), 0) as avg
          FROM festival_donations
          WHERE festival_id = ${festivalId}
            AND payment_method != 'pending'
            AND amount IS NOT NULL`
    );

    const totalRow = totalResult?.rows?.[0] as any || {};
    const residentCollection = parseFloat(String(totalRow.total ?? "0"));
    const totalEntries = totalRow.count ?? 0;
    const averageDonation = parseFloat(String(totalRow.avg ?? "0"));

    // Outsider collection for this festival (paid, non-null amount)
    const outsiderResult = await db.execute(
      sql`SELECT
          COALESCE(SUM(amount::numeric), 0) as total,
          COUNT(*)::int as count
          FROM outsider_donations
          WHERE festival_id = ${festivalId}
            AND payment_status = 'paid'
            AND amount IS NOT NULL`
    );

    const outsiderRow = outsiderResult?.rows?.[0] as any || {};
    const outsiderCollection = parseFloat(String(outsiderRow.total ?? "0"));
    const outsiderDonations = outsiderRow.count ?? 0;

    // Grand total = resident + outsider collection
    const totalCollection = residentCollection + outsiderCollection;

    // Residents paid (distinct, paymentMethod != 'pending')
    const paidResult = await db.execute(
      sql`SELECT COUNT(DISTINCT resident_id)::int as count
          FROM festival_donations
          WHERE festival_id = ${festivalId}
            AND payment_method != 'pending'`
    );
    const residentsPaid = (paidResult?.rows?.[0] as any)?.count ?? 0;

    // Residents pending (distinct, paymentMethod = 'pending')
    const pendingResult = await db.execute(
      sql`SELECT COUNT(DISTINCT resident_id)::int as count
          FROM festival_donations
          WHERE festival_id = ${festivalId}
            AND payment_method = 'pending'`
    );
    const residentsPending = (pendingResult?.rows?.[0] as any)?.count ?? 0;

    // Expected collection
    const expectedCollection = festival.expectedDonation
      ? parseFloat(String(festival.expectedDonation)) * (residentsPaid + residentsPending)
      : 0;

    // Pending collection
    const pendingCollection = expectedCollection > 0
      ? Math.max(0, expectedCollection - totalCollection)
      : 0;

    // Payment method distribution (non-pending only)
    const methodResult = await db.execute(
      sql`SELECT payment_method as method,
          COALESCE(SUM(amount::numeric), 0) as total,
          COUNT(*)::int as count
          FROM festival_donations
          WHERE festival_id = ${festivalId}
            AND payment_method != 'pending'
          GROUP BY payment_method`
    );

    // Collection by day (non-pending only)
    const dailyResult = await db.execute(
      sql`SELECT payment_date as date,
          COALESCE(SUM(amount::numeric), 0) as total,
          COUNT(*)::int as count
          FROM festival_donations
          WHERE festival_id = ${festivalId}
            AND payment_method != 'pending'
            AND payment_date IS NOT NULL
          GROUP BY payment_date
          ORDER BY payment_date`
    );

    // Total active residents (for reference)
    let totalResidents = 0;
    try {
      const residentCount = await db.execute(
        sql`SELECT COUNT(*)::int as count FROM residents WHERE status = 'active'`
      );
      totalResidents = (residentCount.rows?.[0] as any)?.count ?? 0;
    } catch {
      // residents table might not exist
    }

res.json({
      totalCollection,
      residentCollection,
      outsiderCollection,
      outsiderDonations,
      expectedCollection,
      pendingCollection,
      totalEntries,
      totalResidents,
      residentsPaid,
      residentsPending,
      averageDonation,
      paymentMethodDistribution: (methodResult.rows || []).map((m: any) => ({
        method: m.method,
        total: parseFloat(String(m.total)),
        count: m.count,
      })),
      collectionByDay: (dailyResult.rows || []).map((d: any) => ({
        date: d.date,
        total: parseFloat(String(d.total)),
        count: d.count,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching festival stats:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch stats" });
  }
});

// ── GET /api/admin/festivals/:festivalId/collection-summary ─────────────────
// Date-wise collection analytics: total collection, donation counts, and
// payment-method breakdown for a given date (defaults to today).
// Query param: ?date=YYYY-MM-DD

router.get("/admin/festivals/:festivalId/collection-summary", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const admin = (req as any).admin;
    if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
      res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
      return;
    }

    const [festival] = await db
      .select({ id: festivalsTable.id })
      .from(festivalsTable)
      .where(eq(festivalsTable.id, festivalId))
      .limit(1);

    if (!festival) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

    // Validate date param; fall back to today
    const rawDate = (req.query.date as string)?.trim();
    let date = rawDate;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Date().toISOString().split("T")[0];
    }

    // Overall summary for the date.
    // Paid donations are attributed by payment_date; pending donations (payment_date
    // is NULL) are attributed by the day they were recorded (created_at).
    const summaryResult = await db.execute(
      sql`SELECT
          COALESCE(SUM(CASE WHEN payment_method != 'pending' THEN amount::numeric ELSE 0 END), 0) as total_collection,
          COUNT(*)::int as total_donations,
          COUNT(*) FILTER (WHERE payment_method != 'pending')::int as paid_count,
          COUNT(*) FILTER (WHERE payment_method = 'pending')::int as pending_count,
          COALESCE(AVG(CASE WHEN payment_method != 'pending' THEN amount::numeric END), 0) as average_donation
          FROM festival_donations
          WHERE festival_id = ${festivalId}
            AND COALESCE(payment_date, created_at::date) = ${date}`
    );
    const summaryRow = summaryResult?.rows?.[0] as any || {};
    const totalCollection = parseFloat(String(summaryRow.total_collection ?? "0"));
    const totalDonations = summaryRow.total_donations ?? 0;
    const paidCount = summaryRow.paid_count ?? 0;
    const pendingCount = summaryRow.pending_count ?? 0;
    const averageDonation = parseFloat(String(summaryRow.average_donation ?? "0"));

    // Payment-method breakdown for the date
    const methodResult = await db.execute(
      sql`SELECT payment_method as method,
          COALESCE(SUM(CASE WHEN payment_method != 'pending' THEN amount::numeric ELSE 0 END), 0) as total,
          COUNT(*)::int as count
          FROM festival_donations
          WHERE festival_id = ${festivalId}
            AND COALESCE(payment_date, created_at::date) = ${date}
          GROUP BY payment_method`
    );

    // Normalize: bank_transfer -> bank. Return as a sorted array (by amount desc),
    // including only methods that have at least one record for the date.
    const methodMap = new Map<string, { amount: number; count: number }>();
    (methodResult.rows || []).forEach((m: any) => {
      const key = m.method === "bank_transfer" ? "bank" : (m.method || "pending");
      const existing = methodMap.get(key);
      if (existing) {
        existing.amount += parseFloat(String(m.total ?? "0"));
        existing.count += m.count ?? 0;
      } else {
        methodMap.set(key, {
          amount: parseFloat(String(m.total ?? "0")),
          count: m.count ?? 0,
        });
      }
    });

    const paymentMethods = Array.from(methodMap.entries())
      .map(([method, { amount, count }]) => ({ method, amount, count }))
      .sort((a, b) => b.amount - a.amount);

    res.json({
      date,
      totalCollection,
      totalDonations,
      paidCount,
      pendingCount,
      averageDonation,
      paymentMethods,
    });
  } catch (err: any) {
    console.error("Error fetching collection summary:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch collection summary" });
  }
});

// ── GET /api/admin/festivals/:festivalId/pending-residents ──────────────────
// Get list of residents with pending donations for this festival

router.get("/admin/festivals/:festivalId/pending-residents", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const admin = (req as any).admin;
    if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
      res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
      return;
    }

    const rows = await db.execute(
      sql`SELECT r.id, r.full_name, r.mobile, r.flat_no, r.building_id, r.wing_id,
          b.building_name, w.wing_name, fd.id as donation_id, fd.notes as donation_notes,
          fd.created_at as pending_since
          FROM festival_donations fd
          JOIN residents r ON fd.resident_id = r.id
          LEFT JOIN buildings b ON r.building_id = b.id
          LEFT JOIN wings w ON r.wing_id = w.id
          WHERE fd.festival_id = ${festivalId}
            AND fd.payment_method = 'pending'
          ORDER BY r.full_name`
    );

    const pending = (rows.rows || []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      mobile: row.mobile,
      flatNo: row.flat_no,
      buildingName: row.building_name,
      wingName: row.wing_name,
      donationId: row.donation_id,
      notes: row.donation_notes,
      pendingSince: row.pending_since?.toISOString?.() || row.pending_since,
    }));

    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch pending residents" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DOOR-TO-DOOR COLLECTION ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/festivals/:festivalId/door-to-door ───────────────────────
// Returns all residents in a building with their donation status for this festival

router.get("/admin/festivals/:festivalId/door-to-door", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const admin = (req as any).admin;
    if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
      res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
      return;
    }

    const buildingIdParam = req.query.buildingId as string | undefined;
    const wingIdParam = req.query.wingId as string | undefined;

    if (!buildingIdParam) {
      res.status(400).json({ error: "Building ID is required" });
      return;
    }

    const buildingId = parseInt(buildingIdParam, 10);
    if (isNaN(buildingId)) {
      res.status(400).json({ error: "Invalid building ID" });
      return;
    }

    let wingId: number | null = null;
    if (wingIdParam) {
      wingId = parseInt(wingIdParam, 10);
      if (isNaN(wingId)) wingId = null;
    }

    // Get all residents in the building with their donation status
    let query = sql`
      SELECT r.id, r.full_name, r.mobile, r.flat_no, r.building_id, r.wing_id,
             b.building_name, w.wing_name,
             fd.id as donation_id, fd.payment_method, fd.amount, fd.payment_date,
             fd.receipt_number, fd.collected_by_admin_name, fd.notes
      FROM residents r
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN wings w ON r.wing_id = w.id
      LEFT JOIN festival_donations fd ON fd.resident_id = r.id AND fd.festival_id = ${festivalId}
      WHERE r.building_id = ${buildingId}
        AND r.status = 'active'
    `;

    if (wingId) {
      query = sql`${query} AND r.wing_id = ${wingId}`;
    }

    query = sql`${query} ORDER BY r.flat_no`;

    const result = await db.execute(query);

    const residents = (result.rows || []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      mobile: row.mobile,
      flatNo: row.flat_no,
      buildingName: row.building_name,
      wingName: row.wing_name,
      donationId: row.donation_id,
      paymentMethod: row.payment_method || null,
      amount: row.amount ? parseFloat(String(row.amount)) : null,
      paymentDate: row.payment_date,
      receiptNumber: row.receipt_number,
      collectedByAdminName: row.collected_by_admin_name,
      notes: row.notes,
    }));

    res.json({ residents });
  } catch (err: any) {
    console.error("Error fetching door-to-door data:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch door-to-door data" });
  }
});

// ── POST /api/admin/festivals/:festivalId/door-to-door/collect ──────────────
// Quick collect donation from door-to-door mode

router.post("/admin/festivals/:festivalId/door-to-door/collect", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.festivalId as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const body = req.body || {};
    const admin = (req as any).admin;

    // Volunteers can only collect for festivals assigned to them
    if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
      res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
      return;
    }

    if (!isPositiveInteger(body.residentId)) {
      res.status(400).json({ error: "Resident ID is required" });
      return;
    }

    if (!body.paymentMethod || body.paymentMethod === "pending") {
      res.status(400).json({ error: "Payment method must be cash, UPI, bank transfer, or cheque" });
      return;
    }

    if (!isPositiveFloat(body.amount)) {
      res.status(400).json({ error: "Valid donation amount is required" });
      return;
    }

    // Check if donation already exists
    const existing = await db
      .select({ id: festivalDonationsTable.id, paymentMethod: festivalDonationsTable.paymentMethod })
      .from(festivalDonationsTable)
      .where(and(
        eq(festivalDonationsTable.festivalId, festivalId),
        eq(festivalDonationsTable.residentId, body.residentId),
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing donation
      const receiptNumber = existing[0].paymentMethod === "pending"
        ? await generateReceiptNumber(festivalId)
        : undefined;

      const updateData: Record<string, unknown> = {
        paymentMethod: body.paymentMethod,
        amount: String(body.amount),
        paymentDate: body.paymentDate || new Date().toISOString().split("T")[0],
        notes: body.notes?.trim() || null,
      };

      if (receiptNumber) {
        updateData.receiptNumber = receiptNumber;
        updateData.receiptGeneratedAt = new Date();
      }

      const [updated] = await db
        .update(festivalDonationsTable)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(festivalDonationsTable.id, existing[0].id))
        .returning();

      res.json({
        ...updated,
        amount: updated.amount ? parseFloat(String(updated.amount)) : null,
      });
    } else {
      // Create new donation
      const receiptNumber = await generateReceiptNumber(festivalId);

      const [donation] = await db
        .insert(festivalDonationsTable)
        .values({
          festivalId,
          residentId: body.residentId,
          paymentMethod: body.paymentMethod,
          amount: String(body.amount),
          paymentDate: body.paymentDate || new Date().toISOString().split("T")[0],
          receiptNumber,
          receiptGeneratedAt: new Date(),
          notes: body.notes?.trim() || null,
          collectedByAdminId: admin?.id || "unknown",
          collectedByAdminName: admin?.fullName || admin?.username || "Unknown Admin",
        })
        .returning();

      res.status(201).json({
        ...donation,
        amount: donation.amount ? parseFloat(String(donation.amount)) : null,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to record donation" });
  }
});

export default router;

