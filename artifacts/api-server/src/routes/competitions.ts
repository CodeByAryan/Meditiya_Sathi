import { Router, type IRouter } from "express";
import { db, competitionsTable, competitionRegistrationsTable, competitionWinnersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import {
  CreateCompetitionBody,
  RegisterForCompetitionParams,
  RegisterForCompetitionBody,
  GetCompetitionWinnersParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/competitions", async (_req, res): Promise<void> => {
  const competitions = await db.select().from(competitionsTable).orderBy(desc(competitionsTable.date));

  const withCounts = await Promise.all(
    competitions.map(async (comp) => {
      const [reg] = await db.select({ count: count() }).from(competitionRegistrationsTable).where(eq(competitionRegistrationsTable.competitionId, comp.id));
      return { ...comp, registrationCount: reg.count };
    })
  );

  res.json(withCounts);
});

router.post("/competitions", async (req, res): Promise<void> => {
  const parsed = CreateCompetitionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [comp] = await db.insert(competitionsTable).values({
    ...parsed.data,
    date: new Date(parsed.data.date),
  }).returning();
  res.status(201).json({ ...comp, registrationCount: 0 });
});

router.post("/competitions/:id/register", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = RegisterForCompetitionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [reg] = await db.insert(competitionRegistrationsTable).values({ ...parsed.data, competitionId: id }).returning();
  res.status(201).json(reg);
});

router.get("/competitions/:id/winners", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const winners = await db.select().from(competitionWinnersTable).where(eq(competitionWinnersTable.competitionId, id));
  res.json(winners);
});

export default router;
