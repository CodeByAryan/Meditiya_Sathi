import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  eventsTable,
  donationsTable,
  volunteersTable,
  serviceRequestsTable,
  festivalsTable,
} from "@workspace/db";
import { count, sql, sum, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats/summary", async (req, res): Promise<void> => {
  const [residents] = await db.select({ count: count() }).from(usersTable);
  const [events] = await db.select({ count: count() }).from(eventsTable);
  const [donations] = await db.select({ total: sum(donationsTable.amount) }).from(donationsTable);
  const [volunteers] = await db.select({ count: count() }).from(volunteersTable).where(eq(volunteersTable.status, "approved"));
  const [complaints] = await db.select({ count: count() }).from(serviceRequestsTable).where(sql`status != 'resolved'`);

  // Days until Ganesh Utsav 2025 (Sep 1 2025)
  const festivalDate = new Date("2025-09-01");
  const today = new Date();
  const daysLeft = Math.max(0, Math.ceil((festivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  res.json({
    totalResidents: residents.count,
    totalEvents: events.count,
    totalDonations: parseFloat(String(donations.total ?? "0")),
    totalVolunteers: volunteers.count,
    activeComplaints: complaints.count,
    festivalDaysLeft: daysLeft,
  });
});

router.get("/stats/donation-progress", async (req, res): Promise<void> => {
  const goal = 500000;
  const [result] = await db.select({ total: sum(donationsTable.amount), cnt: count() }).from(donationsTable);
  const raised = parseFloat(String(result.total ?? "0"));

  res.json({
    goal,
    raised,
    percentage: Math.min(100, Math.round((raised / goal) * 100)),
    festivalName: "Ganesh Utsav 2025",
    donorCount: result.cnt,
  });
});

export default router;
