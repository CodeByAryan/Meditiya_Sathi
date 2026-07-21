import { Router, type IRouter } from "express";
import { db, donationsTable } from "@workspace/db";
import { desc, sum, count, sql } from "drizzle-orm";
import { CreateDonationBody, ListDonationsQueryParams, GetTopDonorsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/donations", async (req, res): Promise<void> => {
  const params = ListDonationsQueryParams.safeParse(req.query);
  const limit = params.success && params.data.limit ? params.data.limit : 50;

  const donations = await db
    .select()
    .from(donationsTable)
    .orderBy(desc(donationsTable.createdAt))
    .limit(limit);

  res.json(donations.map(d => ({ ...d, amount: parseFloat(String(d.amount)) })));
});

router.post("/donations", async (req, res): Promise<void> => {
  const parsed = CreateDonationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [donation] = await db.insert(donationsTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
  }).returning();

  res.status(201).json({ ...donation, amount: parseFloat(String(donation.amount)) });
});

router.get("/donations/top-donors", async (req, res): Promise<void> => {
  const params = GetTopDonorsQueryParams.safeParse(req.query);
  const limit = params.success && params.data.limit ? params.data.limit : 10;

  const donors = await db
    .select({
      donorName: donationsTable.donorName,
      totalAmount: sum(donationsTable.amount),
      donationCount: count(),
    })
    .from(donationsTable)
    .groupBy(donationsTable.donorName)
    .orderBy(sql`sum(${donationsTable.amount}) desc`)
    .limit(limit);

  res.json(donors.map(d => ({
    donorName: d.donorName,
    totalAmount: parseFloat(String(d.totalAmount ?? "0")),
    donationCount: d.donationCount,
  })));
});

export default router;
