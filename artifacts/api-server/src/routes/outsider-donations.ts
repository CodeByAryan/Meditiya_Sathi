import { Router, type IRouter } from "express";
import { db, outsiderDonationsTable, festivalsTable, festivalDonationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

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

    let whereClause = "WHERE 1=1";

    if (festivalId && isPositiveInteger(parseInt(festivalId, 10))) {
      whereClause += ` AND od.festival_id = ${parseInt(festivalId, 10)}`;
    }

    if (statusFilter === "paid" || statusFilter === "pending") {
      whereClause += ` AND od.payment_status = '${statusFilter}'`;
    }

    if (paymentMethodFilter && VALID_METHODS.includes(paymentMethodFilter)) {
      whereClause += ` AND od.payment_method = '${paymentMethodFilter.replace(/'/g, "''")}'`;
    }

    if (dateFrom) whereClause += ` AND od.payment_date >= '${dateFrom.replace(/'/g, "''")}'`;
    if (dateTo) whereClause += ` AND od.payment_date <= '${dateTo.replace(/'/g, "''")}'`;

    if (search) {
      const safeSearch = search.replace(/'/g, "''");
      whereClause += ` AND (LOWER(od.full_name) LIKE LOWER('%${safeSearch}%')
        OR od.mobile LIKE '%${safeSearch}%'
        OR LOWER(COALESCE(od.email, '')) LIKE LOWER('%${safeSearch}%')
        OR LOWER(COALESCE(od.pending_reason, '')) LIKE LOWER('%${safeSearch}%')
        OR LOWER(COALESCE(od.receipt_number, '')) LIKE LOWER('%${safeSearch}%')
        OR LOWER(od.collected_by_admin_name) LIKE LOWER('%${safeSearch}%'))`;
    }

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM outsider_donations od
          LEFT JOIN festivals f ON od.festival_id = f.id
          ${sql.raw(whereClause)}`
    );
    const total = (countResult.rows?.[0] as any)?.count ?? 0;

    const rows = await db.execute(
      sql`SELECT od.*, f.name as festival_name, f.year as festival_year
          FROM outsider_donations od
          LEFT JOIN festivals f ON od.festival_id = f.id
          ${sql.raw(whereClause)}
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

export default router;
