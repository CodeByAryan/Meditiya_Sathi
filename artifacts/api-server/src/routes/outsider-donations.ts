import { Router, type IRouter } from "express";
import { db, outsiderDonationsTable, festivalsTable, festivalDonationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import { generateVarganiPdf } from "../lib/vargani-pdf";
import { getPublicAppBaseUrl, getReceiptPdfUrl, getReceiptShareUrl } from "../lib/app-url";
import {
  isWhatsAppCloudApiConfigured,
  sendWhatsAppDocument,
  normalizePhoneNumber,
  buildVarganiCaption,
} from "../lib/whatsapp-cloud-api";

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

const VALID_METHODS = ["pending", "cash", "upi", "bank_transfer", "cheque"];

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

// ── GET /api/admin/outsider-donations/stats ────────────────────────────────
// Dashboard summary: total collection, total donors, today's collection, pending amount

router.get("/admin/outsider-donations/stats", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const totalResult = await db.execute(
      sql`SELECT
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount::numeric ELSE 0 END), 0) as total_collection,
          COUNT(*)::int as total_donors,
          COALESCE(SUM(CASE WHEN payment_status = 'pending' AND amount IS NOT NULL THEN amount::numeric ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' AND payment_date = ${today} THEN amount::numeric ELSE 0 END), 0) as today_collection
          FROM outsider_donations
          WHERE payment_status = 'paid' OR (payment_status = 'pending' AND payment_date IS NOT NULL)`
    );

    const totalRow = totalResult?.rows?.[0] as any || {};

    // Total donors = distinct outsourced donors (paid)
    const donorsResult = await db.execute(
      sql`SELECT COUNT(DISTINCT full_name)::int as count
          FROM outsider_donations
          WHERE payment_status = 'paid'`
    );

    res.json({
      totalCollection: parseFloat(String(totalRow.total_collection ?? "0")),
      totalDonors: donorsResult?.rows?.[0]?.count ?? 0,
      todayCollection: parseFloat(String(totalRow.today_collection ?? "0")),
      pendingAmount: parseFloat(String(totalRow.pending_amount ?? "0")),
    });
  } catch (err: any) {
    console.error("Error fetching outsider donation stats:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch stats" });
  }
});

// ── GET /api/admin/outsider-donations/analytics ────────────────────────────
// Outsider donation analytics card: totals, averages, highest/lowest, recent donations

router.get("/admin/outsider-donations/analytics", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    // Optional festivalId filter to scope analytics to a single festival
    const festivalIdParam = req.query.festivalId as string | undefined;
    const hasFestivalFilter = festivalIdParam && isPositiveInteger(parseInt(festivalIdParam, 10));
    const festivalCondition = hasFestivalFilter
      ? sql`AND od.festival_id = ${parseInt(festivalIdParam!, 10)}`
      : sql``;

    const result = await db.execute(
      sql`SELECT
          COALESCE(SUM(amount::numeric), 0) as total_collection,
          COUNT(*)::int as total_donations,
          ROUND(COALESCE(AVG(amount::numeric), 0), 0)::int as average_donation,
          COALESCE(MAX(amount::numeric), 0) as highest_donation,
          COALESCE(MIN(amount::numeric), 0) as lowest_donation
          FROM outsider_donations od
          WHERE od.payment_status = 'paid' AND od.amount IS NOT NULL
          ${festivalCondition}`
    );

    const row = result?.rows?.[0] as any || {};

    const recentResult = await db.execute(
      sql`SELECT full_name, amount
          FROM outsider_donations od
          WHERE od.payment_status = 'paid' AND od.amount IS NOT NULL
          ${festivalCondition}
          ORDER BY od.created_at DESC
          LIMIT 5`
    );

    const recentDonations = (recentResult.rows || []).map((r: any) => ({
      name: r.full_name,
      amount: parseFloat(String(r.amount)),
    }));

    res.json({
      totalCollection: parseFloat(String(row.total_collection ?? "0")),
      totalDonations: row.total_donations ?? 0,
      averageDonation: parseFloat(String(row.average_donation ?? "0")),
      highestDonation: parseFloat(String(row.highest_donation ?? "0")),
      lowestDonation: parseFloat(String(row.lowest_donation ?? "0")),
      recentDonations,
    });
  } catch (err: any) {
    console.error("Error fetching outsider donation analytics:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch analytics" });
  }
});

// ── GET /api/admin/outsider-donations/reports ──────────────────────────────
// Donor Type report: Resident Collection vs Outsider Collection vs Grand Total

router.get("/admin/outsider-donations/reports", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const [residentResult, outsiderResult] = await Promise.all([
      db.execute(
        sql`SELECT COALESCE(SUM(amount::numeric), 0) as total
            FROM festival_donations
            WHERE payment_method != 'pending' AND amount IS NOT NULL`
      ),
      db.execute(
        sql`SELECT COALESCE(SUM(amount::numeric), 0) as total
            FROM outsider_donations
            WHERE payment_status = 'paid' AND amount IS NOT NULL`
      ),
    ]);

    const residentCollection = parseFloat(String(residentResult?.rows?.[0]?.total ?? "0"));
    const outsiderCollection = parseFloat(String(outsiderResult?.rows?.[0]?.total ?? "0"));

    res.json({
      residentCollection,
      outsiderCollection,
      grandTotal: residentCollection + outsiderCollection,
    });
  } catch (err: any) {
    console.error("Error fetching donation reports:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch reports" });
  }
});

// ── GET /api/admin/outsider-donations ──────────────────────────────────────
// List all outsider donations with filters, search, pagination

router.get("/admin/outsider-donations", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || "";
    const festivalId = req.query.festivalId as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const paymentMethodFilter = req.query.paymentMethod as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const conditions: ReturnType<typeof sql>[] = [sql`1=1`];

    if (festivalId && isPositiveInteger(parseInt(festivalId, 10))) {
      conditions.push(sql`od.festival_id = ${parseInt(festivalId, 10)}`);
    }

    if (statusFilter === "paid" || statusFilter === "pending") {
      conditions.push(sql`od.payment_status = ${statusFilter}`);
    }

    if (paymentMethodFilter && VALID_METHODS.includes(paymentMethodFilter)) {
      conditions.push(sql`od.payment_method = ${paymentMethodFilter}`);
    }

    if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      conditions.push(sql`od.payment_date >= ${dateFrom}`);
    }
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      conditions.push(sql`od.payment_date <= ${dateTo}`);
    }

    if (search) {
      const safeSearch = `%${search.slice(0, 100)}%`;
      conditions.push(sql`(
        LOWER(od.full_name) LIKE LOWER(${safeSearch})
        OR od.mobile LIKE ${safeSearch}
        OR LOWER(COALESCE(od.email, '')) LIKE LOWER(${safeSearch})
        OR LOWER(COALESCE(od.pending_reason, '')) LIKE LOWER(${safeSearch})
        OR LOWER(COALESCE(od.receipt_number, '')) LIKE LOWER(${safeSearch})
        OR LOWER(od.collected_by_admin_name) LIKE LOWER(${safeSearch})
      )`);
    }

    const whereSql = sql.join(conditions, sql` AND `);

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM outsider_donations od
          LEFT JOIN festivals f ON od.festival_id = f.id
          WHERE ${whereSql}`
    );
    const total = (countResult.rows?.[0] as any)?.count ?? 0;

    const rows = await db.execute(
      sql`SELECT od.*, f.name as festival_name, f.year as festival_year
          FROM outsider_donations od
          LEFT JOIN festivals f ON od.festival_id = f.id
          WHERE ${whereSql}
          ORDER BY od.created_at DESC
          LIMIT ${limit} OFFSET ${offset}`
    );

    const donations = (rows.rows || []).map((row: any) => ({
      id: row.id,
      festivalId: row.festival_id,
      festivalName: row.festival_name,
      festivalYear: row.festival_year,
      fullName: row.full_name,
      mobile: row.mobile,
      email: row.email,
      address: row.address,
      amount: row.amount ? parseFloat(String(row.amount)) : null,
      paymentStatus: row.payment_status || "pending",
      paymentMethod: row.payment_method || "pending",
      pendingReason: row.pending_reason || null,
      receiptNumber: row.receipt_number,
      receiptGeneratedAt: row.receipt_generated_at?.toISOString?.() || row.receipt_generated_at,
      notes: row.notes,
      paymentDate: row.payment_date,
      collectedByAdminId: row.collected_by_admin_id,
      collectedByAdminName: row.collected_by_admin_name,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
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
    console.error("Error fetching outsider donations:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch donations" });
  }
});

// ── POST /api/admin/outsider-donations ─────────────────────────────────────
// Create an outsider donation (auto-collect admin info from token)

router.post("/admin/outsider-donations", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const body = req.body || {};
    const admin = (req as any).admin;

    // Validation
    if (!isNonEmptyString(body.fullName)) {
      res.status(400).json({ error: "Full name is required" });
      return;
    }
    if (!isNonEmptyString(body.mobile)) {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }
    if (!isPositiveInteger(body.festivalId)) {
      res.status(400).json({ error: "Please select a festival" });
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

    const paymentStatus = body.paymentStatus || "pending";
    if (!["paid", "pending"].includes(paymentStatus)) {
      res.status(400).json({ error: "Invalid payment status" });
      return;
    }

    const paymentMethod = body.paymentMethod || "pending";
    if (!VALID_METHODS.includes(paymentMethod)) {
      res.status(400).json({ error: "Invalid payment method" });
      return;
    }

    const isPaid = paymentStatus === "paid";
    if (isPaid) {
      if (!isPositiveFloat(body.amount)) {
        res.status(400).json({ error: "Valid donation amount is required" });
        return;
      }
    }

    // Generate receipt number for paid donations
    let receiptNumber: string | null = null;
    let receiptGeneratedAt: Date | null = null;
    if (isPaid) {
      receiptNumber = await generateReceiptNumber(body.festivalId);
      receiptGeneratedAt = new Date();
    }

    const [donation] = await db
      .insert(outsiderDonationsTable)
      .values({
        festivalId: body.festivalId,
        fullName: body.fullName.trim(),
        mobile: body.mobile.trim(),
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        amount: isPaid ? String(body.amount) : null,
        paymentStatus,
        paymentMethod: isPaid ? paymentMethod : "pending",
        paymentDate: isPaid ? (body.paymentDate || new Date().toISOString().split("T")[0]) : null,
        pendingReason: !isPaid && body.pendingReason ? body.pendingReason.trim() : null,
        receiptNumber,
        receiptGeneratedAt,
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
    console.error("Error creating outsider donation:", err);
    res.status(500).json({ error: err?.message || "Failed to create donation" });
  }
});

// ── PATCH /api/admin/outsider-donations/:id ────────────────────────────────
// Update an outsider donation (supports pending→paid transition)

router.patch("/admin/outsider-donations/:id", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const donationId = parseInt(req.params.id as string, 10);
    if (isNaN(donationId)) {
      res.status(400).json({ error: "Invalid donation ID" });
      return;
    }

    const body = req.body || {};
    const updateData: Record<string, unknown> = {};

    // If payment status is being updated
    if (body.paymentStatus) {
      if (!["paid", "pending"].includes(body.paymentStatus)) {
        res.status(400).json({ error: "Invalid payment status" });
        return;
      }
      const newStatus = body.paymentStatus;
      updateData.paymentStatus = newStatus;

      const becomingPaid = newStatus === "paid";

      if (becomingPaid) {
        const [current] = await db
          .select({ paymentStatus: outsiderDonationsTable.paymentStatus })
          .from(outsiderDonationsTable)
          .where(eq(outsiderDonationsTable.id, donationId))
          .limit(1);

        if (!current) {
          res.status(404).json({ error: "Donation not found" });
          return;
        }

        if (current.paymentStatus === "pending") {
          const [fest] = await db
            .select({ festivalId: outsiderDonationsTable.festivalId })
            .from(outsiderDonationsTable)
            .where(eq(outsiderDonationsTable.id, donationId))
            .limit(1);
          const receiptNumber = await generateReceiptNumber(fest?.festivalId || 0);
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
        if (body.paymentMethod && VALID_METHODS.includes(body.paymentMethod)) {
          updateData.paymentMethod = body.paymentMethod;
        }
        updateData.pendingReason = null;
      } else {
        updateData.amount = null;
        updateData.paymentDate = null;
        updateData.receiptNumber = null;
        updateData.receiptGeneratedAt = null;
        updateData.paymentMethod = "pending";
      }
    } else {
      // Handle individual field updates without changing status
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
      if (body.paymentMethod !== undefined) {
        if (!VALID_METHODS.includes(body.paymentMethod)) {
          res.status(400).json({ error: "Invalid payment method" });
          return;
        }
        updateData.paymentMethod = body.paymentMethod;
      }
      if (body.pendingReason !== undefined) {
        updateData.pendingReason = body.pendingReason?.trim() || null;
      }
      if (body.notes !== undefined) {
        updateData.notes = body.notes?.trim() || null;
      }
      if (body.fullName !== undefined) {
        if (!isNonEmptyString(body.fullName)) {
          res.status(400).json({ error: "Full name cannot be empty" });
          return;
        }
        updateData.fullName = body.fullName.trim();
      }
      if (body.mobile !== undefined) {
        if (!isNonEmptyString(body.mobile)) {
          res.status(400).json({ error: "Mobile cannot be empty" });
          return;
        }
        updateData.mobile = body.mobile.trim();
      }
      if (body.email !== undefined) updateData.email = body.email?.trim() || null;
      if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(outsiderDonationsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(outsiderDonationsTable.id, donationId))
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
    console.error("Error updating outsider donation:", err);
    res.status(500).json({ error: err?.message || "Failed to update donation" });
  }
});

// ── DELETE /api/admin/outsider-donations/:id ───────────────────────────────
// Delete an outsider donation

router.delete("/admin/outsider-donations/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const donationId = parseInt(req.params.id as string, 10);
    if (isNaN(donationId)) {
      res.status(400).json({ error: "Invalid donation ID" });
      return;
    }

    const [deleted] = await db
      .delete(outsiderDonationsTable)
      .where(eq(outsiderDonationsTable.id, donationId))
      .returning({ id: outsiderDonationsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Donation not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete donation" });
  }
});

// ── GET/POST /api/admin/outsider-donations/:id/vargani-pdf ──────────────────
// Generate fresh Vargani PDF for an outsider donation from latest DB data

router.all(["/admin/outsider-donations/:id/vargani-pdf", "/admin/outsider-donations/:id/vargani-pdf/download"], requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid donation ID" });
      return;
    }

    const rows = await db.execute(sql`
      SELECT od.*, f.name as festival_name, f.year as festival_year
      FROM outsider_donations od
      LEFT JOIN festivals f ON od.festival_id = f.id
      WHERE od.id = ${id}
      LIMIT 1
    `);
    const row = (rows.rows || [])[0] as any;
    if (!row) {
      res.status(404).json({ error: "Donation not found" });
      return;
    }

    if (row.payment_status !== "paid" || row.amount == null || !row.receipt_number) {
      res.status(422).json({ error: "A paid donation with receipt number is required" });
      return;
    }

    const admin = (req as any).admin;
    const collectedBy = row.collected_by_admin_name || admin?.fullName || admin?.username || "Authorized Signatory";

    const pdf = await generateVarganiPdf({
      receiptNumber: row.receipt_number,
      donationDate: row.payment_date || row.created_at,
      name: row.full_name,
      mobile: row.mobile,
      building: null,
      wing: null,
      flat: null,
      amount: Number(row.amount),
      paymentMethod: row.payment_method || "cash",
      festivalName: row.festival_name,
      festivalYear: Number(row.festival_year),
      collectedBy,
    });

    if (req.path.endsWith("/download") || req.query.download === "true") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Vargani-${row.receipt_number}.pdf"`);
      res.setHeader("Content-Length", pdf.length);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      res.end(pdf);
      return;
    }

    const url = getReceiptPdfUrl(row.receipt_number);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    res.json({
      success: true,
      pdfUrl: url,
      downloadUrl: `${url}?download=true`,
      filename: `Vargani-${row.receipt_number}.pdf`,
      donation: {
        id: row.id,
        festivalId: row.festival_id,
        festivalName: row.festival_name,
        festivalYear: row.festival_year,
        fullName: row.full_name,
        mobile: row.mobile,
        amount: Number(row.amount),
        paymentMethod: row.payment_method,
        paymentDate: row.payment_date,
        receiptNumber: row.receipt_number,
        collectedByAdminName: collectedBy,
      },
    });
  } catch (err: any) {
    console.error("Outsider Vargani PDF generation failed:", err?.stack || err);
    res.status(500).json({ error: "Failed to generate Vargani receipt PDF" });
  }
});

// ── POST /api/admin/outsider-donations/:id/send-whatsapp ───────────────────
// Send fresh Vargani PDF document directly to outsider donor via WhatsApp Business Cloud API
router.post("/admin/outsider-donations/:id/send-whatsapp", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid donation ID" });
      return;
    }

    const rows = await db.execute(sql`
      SELECT od.*, f.name as festival_name, f.year as festival_year
      FROM outsider_donations od
      LEFT JOIN festivals f ON od.festival_id = f.id
      WHERE od.id = ${id}
      LIMIT 1
    `);
    const row = (rows.rows || [])[0] as any;
    if (!row) {
      res.status(404).json({ error: "Donation not found" });
      return;
    }

    if (row.payment_status !== "paid" || row.amount == null || !row.receipt_number) {
      res.status(422).json({ error: "A paid donation with receipt number is required to send receipt" });
      return;
    }

    const rawMobile = row.mobile || req.body?.mobile;
    const phoneNorm = normalizePhoneNumber(rawMobile);
    if (!phoneNorm.isValid) {
      res.status(400).json({
        error: phoneNorm.error || "Invalid donor mobile number for WhatsApp delivery",
        recipient: rawMobile,
      });
      return;
    }

    const receiptUrl = getReceiptPdfUrl(row.receipt_number);

    if (!isWhatsAppCloudApiConfigured()) {
      res.status(400).json({
        success: false,
        configured: false,
        fallbackRequired: true,
        error: "WhatsApp Cloud API is not configured. Please configure WhatsApp Business API credentials.",
        receiptUrl,
        recipient: phoneNorm.normalized,
      });
      return;
    }

    const admin = (req as any).admin;
    const collectedBy = row.collected_by_admin_name || admin?.fullName || admin?.username || "Authorized Signatory";
    const pdf = await generateVarganiPdf({
      receiptNumber: row.receipt_number,
      donationDate: row.payment_date || row.created_at,
      name: row.full_name,
      mobile: row.mobile,
      building: null,
      wing: null,
      flat: null,
      amount: Number(row.amount),
      paymentMethod: row.payment_method || "cash",
      festivalName: row.festival_name,
      festivalYear: Number(row.festival_year),
      collectedBy,
    });

    const caption = buildVarganiCaption({
      receiptNumber: row.receipt_number,
      festivalName: row.festival_name,
      donorName: row.full_name,
      amount: Number(row.amount),
      pdfUrl: receiptUrl,
    });

    const sendResult = await sendWhatsAppDocument({
      to: phoneNorm.normalized,
      filename: `Vargani-${row.receipt_number}.pdf`,
      pdfBuffer: pdf,
      pdfUrl: receiptUrl,
      caption,
    });

    if (!sendResult.success) {
      res.status(500).json({
        success: false,
        configured: true,
        error: sendResult.error || "Failed to send receipt via WhatsApp Business API",
        receiptUrl,
      });
      return;
    }

    res.json({
      success: true,
      configured: true,
      message: "Receipt sent successfully via WhatsApp Business API",
      messageId: sendResult.messageId,
      recipient: phoneNorm.normalized,
      receiptNumber: row.receipt_number,
      pdfUrl: receiptUrl,
    });
  } catch (err: any) {
    console.error("Outsider WhatsApp delivery error:", err?.stack || err);
    res.status(500).json({ error: "Failed to process WhatsApp receipt delivery" });
  }
});

export default router;
