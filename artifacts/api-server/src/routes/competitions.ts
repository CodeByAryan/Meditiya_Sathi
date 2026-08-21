import { Router, type IRouter } from "express";
import multer from "multer";
import { createHmac, randomBytes } from "node:crypto";
import { db, buildingsTable, competitionEntriesTable, competitionEntryImagesTable, competitionRegistrationsTable, competitionSecurityAttemptsTable, competitionVotesTable, competitionWinnersTable, competitionsTable, residentsTable, wingsTable } from "@workspace/db";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireRole } from "../middlewares/requireRole";
import { cloudinary, isCloudinaryConfigured } from "../lib/cloudinary";

const router: IRouter = Router();
const secret = process.env.VOTER_HASH_SECRET || "meditiya-sathi-voter-secret-key-2025";
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: 5 * 1024 * 1024 }, fileFilter: (_r, f, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(f.mimetype)) });
const residentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Invalid mobile number format"),
  buildingId: z.coerce.number().int().positive(),
  wingId: z.preprocess((val) => (val === "" || val === undefined || val === "null" ? null : val), z.coerce.number().int().positive().nullable().optional()),
  flatNo: z.string().trim().min(1).max(30),
});
const settingsSchema = z.object({
  name: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80).default("Ganpati Decoration"),
  description: z.string().trim().min(10).max(5000),
  rules: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["draft", "registration_open", "registration_closed", "voting_open", "voting_closed", "completed", "DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "VOTING_OPEN", "VOTING_CLOSED", "COMPLETED"]).optional().default("draft"),
  date: z.string().datetime().optional(),
  registrationStart: z.string().datetime().nullable().optional(),
  registrationEnd: z.string().datetime().nullable().optional(),
  votingStart: z.string().datetime().nullable().optional(),
  votingEnd: z.string().datetime().nullable().optional(),
  maxImages: z.number().int().min(1).max(5).default(3),
  resultsPublished: z.boolean().optional()
});
const id = (v: unknown) => { const r = z.coerce.number().int().positive().safeParse(v); return r.success ? r.data : null; };
const asDate = (v?: string | null) => v ? new Date(v) : null;
const isRegistrationOpen = (c: any) => String(c?.status || "").toLowerCase() === "registration_open";
const isVotingOpen = (c: any) => String(c?.status || "").toLowerCase() === "voting_open";
function reqHashes(req: any) {
  const key = secret;
  const h = (v: string) => createHmac("sha256", key).update(v).digest("hex");
  const ip = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
  return { ip, ipHash: h(`ip:${ip}`), userAgentHash: h(`ua:${req.get("user-agent") || ""}`) };
}
async function resident(data: z.infer<typeof residentSchema>) { const where = [eq(residentsTable.fullName, data.fullName), eq(residentsTable.mobile, data.mobile), eq(residentsTable.buildingId, data.buildingId), eq(residentsTable.flatNo, data.flatNo), eq(residentsTable.status, "active"), data.wingId == null ? sql`${residentsTable.wingId} IS NULL` : eq(residentsTable.wingId, data.wingId)]; return (await db.select({ id: residentsTable.id, fullName: residentsTable.fullName, buildingName: buildingsTable.buildingName, wingName: wingsTable.wingName }).from(residentsTable).innerJoin(buildingsTable, eq(residentsTable.buildingId, buildingsTable.id)).leftJoin(wingsTable, eq(residentsTable.wingId, wingsTable.id)).where(and(...where)).limit(1))[0]; }

async function findOrCreateResident(data: z.infer<typeof residentSchema>) {
  const exactWhere = [
    eq(residentsTable.fullName, data.fullName),
    eq(residentsTable.mobile, data.mobile),
    eq(residentsTable.buildingId, data.buildingId),
    eq(residentsTable.flatNo, data.flatNo),
    data.wingId == null ? sql`${residentsTable.wingId} IS NULL` : eq(residentsTable.wingId, data.wingId),
  ];

  const [exact] = await db
    .select({ id: residentsTable.id })
    .from(residentsTable)
    .where(and(...exactWhere))
    .limit(1);

  if (exact) return exact;

  const [byMobile] = await db
    .select({ id: residentsTable.id })
    .from(residentsTable)
    .where(eq(residentsTable.mobile, data.mobile))
    .limit(1);

  if (byMobile) return byMobile;

  const flatWhere = [
    eq(residentsTable.buildingId, data.buildingId),
    eq(residentsTable.flatNo, data.flatNo),
    data.wingId == null ? sql`${residentsTable.wingId} IS NULL` : eq(residentsTable.wingId, data.wingId),
  ];

  const [byFlat] = await db
    .select({ id: residentsTable.id })
    .from(residentsTable)
    .where(and(...flatWhere))
    .limit(1);

  if (byFlat) return byFlat;

  const [newResident] = await db
    .insert(residentsTable)
    .values({
      fullName: data.fullName,
      mobile: data.mobile,
      buildingId: data.buildingId,
      wingId: data.wingId,
      flatNo: data.flatNo,
      status: "active",
    })
    .returning({ id: residentsTable.id });

  return newResident;
}
function cloudUpload(buffer: Buffer) { return new Promise<{url:string;publicId:string}>((resolve, reject) => { const s = cloudinary.uploader.upload_stream({ folder: "meditiya-sathi/competitions", format: "webp", transformation: [{width:1600,height:1200,crop:"limit"},{quality:"auto:good"}] }, (e,r) => e || !r ? reject(e || Error("Upload failed")) : resolve({url:r.secure_url,publicId:r.public_id})); s.end(buffer); }); }
async function captcha(token: string, ip: string) { if (!turnstileSecret || !token) return false; try { const body = new URLSearchParams({secret:turnstileSecret,response:token,remoteip:ip}); const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body}); return r.ok && !!((await r.json()) as { success?: boolean }).success; } catch { return false; } }
async function attempt(req:any, competitionId:number, entryId:number | null, outcome:string) { if (!secret) return; const {ipHash,userAgentHash}=reqHashes(req); await db.insert(competitionSecurityAttemptsTable).values({competitionId,entryId,attemptType:"vote",outcome,ipHash,userAgentHash}).catch(()=>undefined); }

router.get("/competitions", async (_q, res) => {
  try {
    const competitions = await db
      .select()
      .from(competitionsTable)
      .where(sql`LOWER(${competitionsTable.status}) != 'draft'`)
      .orderBy(desc(competitionsTable.date));
    res.json(competitions);
  } catch (error) {
    console.error("GET /api/competitions failed", error);
    res.status(500).json({ error: "Unable to load competitions." });
  }
});

router.get("/competitions/:id", async (req, res) => {
  try {
    const competitionId = id(req.params.id);
    const c =
      competitionId &&
      (
        await db
          .select()
          .from(competitionsTable)
          .where(and(eq(competitionsTable.id, competitionId), sql`LOWER(${competitionsTable.status}) != 'draft'`))
          .limit(1)
      )[0];

    if (!c) {
      res.status(404).json({ error: "Competition not found" });
      return;
    }

    res.json({
      ...c,
      registrationOpen: isRegistrationOpen(c),
      votingOpen: isVotingOpen(c),
    });
  } catch (error) {
    console.error("GET /api/competitions/:id failed", error);
    res.status(500).json({ error: "Unable to load competition." });
  }
});
router.get("/competitions/:id/entries", async (req, res) => {
  try {
    const competitionId = id(req.params.id);
    if (!competitionId) {
      res.status(400).json({ error: "Invalid competition id" });
      return;
    }

    const rows = await db
      .select({
        id: competitionEntriesTable.id,
        title: competitionEntriesTable.title,
        description: competitionEntriesTable.description,
        residentName: residentsTable.fullName,
        buildingName: buildingsTable.buildingName,
        wingName: wingsTable.wingName,
        imageUrl: competitionEntryImagesTable.imageUrl,
        displayOrder: competitionEntryImagesTable.displayOrder,
        votes: sql<number>`COUNT(${competitionVotesTable.id})::int`,
      })
      .from(competitionEntriesTable)
      .innerJoin(residentsTable, eq(competitionEntriesTable.residentId, residentsTable.id))
      .innerJoin(buildingsTable, eq(residentsTable.buildingId, buildingsTable.id))
      .leftJoin(wingsTable, eq(residentsTable.wingId, wingsTable.id))
      .leftJoin(competitionEntryImagesTable, eq(competitionEntryImagesTable.entryId, competitionEntriesTable.id))
      .leftJoin(competitionVotesTable, eq(competitionVotesTable.entryId, competitionEntriesTable.id))
      .where(and(eq(competitionEntriesTable.competitionId, competitionId), eq(competitionEntriesTable.status, "approved")))
      .groupBy(
        competitionEntriesTable.id,
        residentsTable.fullName,
        buildingsTable.buildingName,
        wingsTable.wingName,
        competitionEntryImagesTable.id
      )
      .orderBy(desc(sql`COUNT(${competitionVotesTable.id})`));

    const map = new Map<number, any>();
    rows.forEach((r) => {
      const e = map.get(r.id) || { ...r, images: [] };
      delete e.imageUrl;
      delete e.displayOrder;
      if (r.imageUrl) {
        e.images.push({ imageUrl: r.imageUrl, displayOrder: r.displayOrder });
      }
      map.set(r.id, e);
    });

    res.json([...map.values()]);
  } catch (error) {
    console.error("GET /api/competitions/:id/entries failed", error);
    res.status(500).json({ error: "Unable to load entries." });
  }
});
router.post("/competitions/:id/verify-resident", async (req, res) => {
  const competitionId = id(req.params.id);
  const data = residentSchema.safeParse(req.body);
  const c = competitionId && (await db.select().from(competitionsTable).where(eq(competitionsTable.id, competitionId)).limit(1))[0];

  if (!data.success || !c || !isRegistrationOpen(c)) {
    res.status(403).json({ error: "Registration is not open for this competition." });
    return;
  }

  const r = await resident(data.data);
  if (!r) {
    res.status(403).json({ error: "We could not verify these resident details." });
    return;
  }

  res.json({ verified: true, resident: { fullName: r.fullName, buildingName: r.buildingName, wingName: r.wingName } });
});
router.post("/competitions/:id/register", (req, res) =>
  upload.array("images", 5)(req, res, async (error) => {
    const competitionId = id(req.params.id);
    const data = residentSchema.safeParse({ ...req.body, wingId: req.body.wingId || null });
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const files = (req.files || []) as Express.Multer.File[];

    const c = competitionId && (await db.select().from(competitionsTable).where(eq(competitionsTable.id, competitionId)).limit(1))[0];

    if (!c || !isRegistrationOpen(c)) {
      res.status(403).json({ error: "Registration is closed for this competition." });
      return;
    }

    if (error || !data.success || title.length < 2 || description.length < 10 || !files.length) {
      res.status(400).json({ error: "Please provide valid participant details, entry title, description, and images." });
      return;
    }

    if (!isCloudinaryConfigured) {
      res.status(503).json({ error: "Image upload service is not configured." });
      return;
    }

    const r = await findOrCreateResident(data.data);

    try {
      const imgs = await Promise.all(files.slice(0, c.maxImages || 3).map((f) => cloudUpload(f.buffer)));
      const entry = await db.transaction(async (tx) => {
        const [e] = await tx
          .insert(competitionEntriesTable)
          .values({
            competitionId,
            residentId: r.id,
            title,
            description,
            status: "pending",
          })
          .returning();

        await tx.insert(competitionEntryImagesTable).values(
          imgs.map((image, displayOrder) => ({
            entryId: e.id,
            imageUrl: image.url,
            cloudinaryPublicId: image.publicId,
            displayOrder,
          }))
        );

        return e;
      });

      res.status(201).json({ id: entry.id, status: "pending", message: "Your entry has been submitted successfully. Our Admin team will verify your details and approve your entry before it becomes visible publicly." });
    } catch (e: any) {
      if (e?.code === "23505") {
        res.status(409).json({ error: "An entry for this participant already exists in this competition." });
      } else {
        res.status(502).json({ error: "Unable to submit your entry." });
      }
    }
  })
);
router.post("/competitions/:id/vote", async (req, res) => {
  try {
    const competitionId = id(req.params.id);
    const entryId = id(req.body?.entryId);

    if (!competitionId || !entryId) {
      res.status(400).json({ error: "Invalid vote request." });
      return;
    }

    if (!secret) {
      res.status(503).json({ error: "Voting security is not configured." });
      return;
    }

    const { ip, ipHash, userAgentHash } = reqHashes(req);
    const since = new Date(Date.now() - 600000);

    const [{ count: tries }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(competitionSecurityAttemptsTable)
      .where(
        and(
          eq(competitionSecurityAttemptsTable.ipHash, ipHash),
          gte(competitionSecurityAttemptsTable.createdAt, since)
        )
      );

    if (tries >= 30) {
      await attempt(req, competitionId, entryId, "blocked_rate_limit");
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    const c = (
      await db
        .select()
        .from(competitionsTable)
        .where(eq(competitionsTable.id, competitionId))
        .limit(1)
    )[0];

    if (!c || !isVotingOpen(c)) {
      res.status(403).json({ error: "Voting is currently not open for this competition." });
      return;
    }

    const e = (
      await db
        .select({ id: competitionEntriesTable.id })
        .from(competitionEntriesTable)
        .where(
          and(
            eq(competitionEntriesTable.id, entryId),
            eq(competitionEntriesTable.competitionId, competitionId),
            eq(competitionEntriesTable.status, "approved")
          )
        )
        .limit(1)
    )[0];

    if (!e) {
      res.status(404).json({ error: "This entry is not eligible for voting." });
      return;
    }

    const raw = req.cookies?.ms_competition_voter || randomBytes(32).toString("base64url");
    const voterHash = createHmac("sha256", secret).update(`voter:${raw}`).digest("hex");

    const [{ count: networkVotes }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(competitionVotesTable)
      .where(
        and(
          eq(competitionVotesTable.competitionId, competitionId),
          eq(competitionVotesTable.ipHash, ipHash),
          gte(competitionVotesTable.createdAt, since)
        )
      );

    const riskStatus = networkVotes >= 10 ? "suspicious" : "normal";
    const riskScore = networkVotes >= 10 ? 40 : 0;

    try {
      await db.insert(competitionVotesTable).values({
        competitionId,
        entryId,
        voterHash,
        ipHash,
        userAgentHash,
        riskStatus,
        riskScore,
        riskMetadata: { networkVotes10m: networkVotes },
      });

      if (!req.cookies?.ms_competition_voter) {
        res.cookie("ms_competition_voter", raw, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
      }

      await attempt(req, competitionId, entryId, "vote_success");
      res.json({ message: "Your vote has been recorded successfully." });
    } catch (err: any) {
      if (err?.code === "23505") {
        await attempt(req, competitionId, entryId, "duplicate");
        res.status(409).json({ error: "You have already voted in this competition." });
      } else {
        console.error("Vote insertion error:", err);
        res.status(500).json({ error: "Unable to record your vote." });
      }
    }
  } catch (err: any) {
    console.error("POST /competitions/:id/vote error:", err);
    res.status(500).json({ error: "Unable to record vote." });
  }
});
router.get("/admin/competitions", requireRole("Super Admin", "Admin"), async (_q, res) => {
  try {
    const competitions = await db.select().from(competitionsTable).orderBy(desc(competitionsTable.createdAt));

    let stats: any[] = [];
    let voteStats: any[] = [];

    try {
      stats = await db
        .select({
          competitionId: competitionEntriesTable.competitionId,
          totalEntries: sql<number>`COUNT(DISTINCT ${competitionEntriesTable.id})::int`,
          pendingEntries: sql<number>`COUNT(DISTINCT CASE WHEN ${competitionEntriesTable.status} = 'pending' THEN ${competitionEntriesTable.id} END)::int`,
          approvedEntries: sql<number>`COUNT(DISTINCT CASE WHEN ${competitionEntriesTable.status} = 'approved' THEN ${competitionEntriesTable.id} END)::int`,
          rejectedEntries: sql<number>`COUNT(DISTINCT CASE WHEN ${competitionEntriesTable.status} = 'rejected' THEN ${competitionEntriesTable.id} END)::int`,
        })
        .from(competitionEntriesTable)
        .groupBy(competitionEntriesTable.competitionId);
    } catch (e) {
      console.warn("Could not fetch competition entry stats", e);
    }

    try {
      voteStats = await db
        .select({
          competitionId: competitionVotesTable.competitionId,
          totalVotes: sql<number>`COUNT(*)::int`,
        })
        .from(competitionVotesTable)
        .groupBy(competitionVotesTable.competitionId);
    } catch (e) {
      console.warn("Could not fetch competition vote stats", e);
    }

    const statsMap = new Map(stats.map((s) => [s.competitionId, s]));
    const voteStatsMap = new Map(voteStats.map((v) => [v.competitionId, v.totalVotes]));

    const result = competitions.map((c) => {
      const s = statsMap.get(c.id) || { totalEntries: 0, pendingEntries: 0, approvedEntries: 0, rejectedEntries: 0 };
      const totalVotes = voteStatsMap.get(c.id) || 0;
      return {
        ...c,
        totalEntries: s.totalEntries || 0,
        pendingEntries: s.pendingEntries || 0,
        approvedEntries: s.approvedEntries || 0,
        rejectedEntries: s.rejectedEntries || 0,
        totalVotes,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("GET /api/admin/competitions failed", error);
    res.status(500).json({ error: "Unable to load admin competitions." });
  }
});
router.get("/admin/competitions/:id/entries",requireRole("Super Admin","Admin"),async(req,res)=>{const competitionId=id(req.params.id);if(!competitionId){res.status(400).json({error:"Invalid competition id"});return;}const rows=await db.select({id:competitionEntriesTable.id,title:competitionEntriesTable.title,description:competitionEntriesTable.description,status:competitionEntriesTable.status,reviewNote:competitionEntriesTable.reviewNote,createdAt:competitionEntriesTable.createdAt,updatedAt:competitionEntriesTable.updatedAt,residentName:residentsTable.fullName,flatNo:residentsTable.flatNo,buildingName:buildingsTable.buildingName,wingName:wingsTable.wingName,imageUrl:competitionEntryImagesTable.imageUrl,displayOrder:competitionEntryImagesTable.displayOrder,votes:sql<number>`COUNT(${competitionVotesTable.id})::int`}).from(competitionEntriesTable).innerJoin(residentsTable,eq(competitionEntriesTable.residentId,residentsTable.id)).innerJoin(buildingsTable,eq(residentsTable.buildingId,buildingsTable.id)).leftJoin(wingsTable,eq(residentsTable.wingId,wingsTable.id)).leftJoin(competitionEntryImagesTable,eq(competitionEntryImagesTable.entryId,competitionEntriesTable.id)).leftJoin(competitionVotesTable,eq(competitionVotesTable.entryId,competitionEntriesTable.id)).where(eq(competitionEntriesTable.competitionId,competitionId)).groupBy(competitionEntriesTable.id,residentsTable.fullName,residentsTable.flatNo,buildingsTable.buildingName,wingsTable.wingName,competitionEntryImagesTable.id).orderBy(desc(competitionEntriesTable.createdAt));const map=new Map<number,any>();rows.forEach(r=>{const e=map.get(r.id)||{...r,images:[]};delete e.imageUrl;delete e.displayOrder;if(r.imageUrl)e.images.push({imageUrl:r.imageUrl,displayOrder:r.displayOrder});map.set(r.id,e)});res.json([...map.values()])});
router.post("/admin/competitions", requireRole("Super Admin", "Admin"), async (req: any, res) => {
  const p = settingsSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ error: "Invalid competition settings.", details: p.error.format() });
    return;
  }
  const d = p.data;
  const [c] = await db
    .insert(competitionsTable)
    .values({
      name: d.name,
      category: d.category,
      description: d.description,
      rules: d.rules || null,
      status: "draft",
      date: asDate(d.date) || new Date(),
      registrationStart: asDate(d.registrationStart),
      registrationEnd: asDate(d.registrationEnd),
      votingStart: asDate(d.votingStart),
      votingEnd: asDate(d.votingEnd),
      maxImages: d.maxImages,
      resultsPublished: 0,
      createdByAdminId: req.admin?.id || null,
    })
    .returning();

  res.status(201).json(c);
});

router.patch("/admin/competitions/:id", requireRole("Super Admin", "Admin"), async (req: any, res) => {
  const competitionId = id(req.params.id);
  if (!competitionId) {
    res.status(400).json({ error: "Invalid competition id" });
    return;
  }

  const p = settingsSchema.partial().safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ error: "Invalid competition updates." });
    return;
  }

  const d = p.data;
  const updateData: Record<string, any> = {};
  if (d.name !== undefined) updateData.name = d.name;
  if (d.category !== undefined) updateData.category = d.category;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.rules !== undefined) updateData.rules = d.rules;
  if (d.date !== undefined) updateData.date = asDate(d.date);
  if (d.registrationStart !== undefined) updateData.registrationStart = asDate(d.registrationStart);
  if (d.registrationEnd !== undefined) updateData.registrationEnd = asDate(d.registrationEnd);
  if (d.votingStart !== undefined) updateData.votingStart = asDate(d.votingStart);
  if (d.votingEnd !== undefined) updateData.votingEnd = asDate(d.votingEnd);
  if (d.maxImages !== undefined) updateData.maxImages = d.maxImages;

  const [updated] = await db.update(competitionsTable).set(updateData).where(eq(competitionsTable.id, competitionId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  res.json(updated);
});

router.put("/admin/competitions/:id", requireRole("Super Admin", "Admin"), async (req: any, res) => {
  const competitionId = id(req.params.id);
  if (!competitionId) {
    res.status(400).json({ error: "Invalid competition id" });
    return;
  }

  const p = settingsSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ error: "Invalid competition payload." });
    return;
  }

  const d = p.data;
  const [updated] = await db
    .update(competitionsTable)
    .set({
      name: d.name,
      category: d.category,
      description: d.description,
      rules: d.rules || null,
      date: asDate(d.date) || new Date(),
      registrationStart: asDate(d.registrationStart),
      registrationEnd: asDate(d.registrationEnd),
      votingStart: asDate(d.votingStart),
      votingEnd: asDate(d.votingEnd),
      maxImages: d.maxImages,
    })
    .where(eq(competitionsTable.id, competitionId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  res.json(updated);
});

// ── MANUAL LIFECYCLE CONTROLS ──────────────────────────────────────────────────

const handleStartRegistration = async (req: any, res: any) => {
  const competitionId = id(req.params.id);
  if (!competitionId) {
    res.status(400).json({ error: "Invalid competition id" });
    return;
  }

  const c = (await db.select().from(competitionsTable).where(eq(competitionsTable.id, competitionId)).limit(1))[0];
  if (!c) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  const currStatus = String(c.status).toLowerCase();
  if (currStatus !== "draft") {
    res.status(400).json({ error: `Cannot start registration from state '${c.status}'. Registration can only be started from DRAFT state.` });
    return;
  }

  const [updated] = await db.update(competitionsTable).set({ status: "registration_open" }).where(eq(competitionsTable.id, competitionId)).returning();
  res.json({ message: "Registration started successfully.", competition: updated });
};

router.post("/admin/competitions/:id/start-registration", requireRole("Super Admin", "Admin"), handleStartRegistration);
router.post("/competitions/:id/start-registration", requireRole("Super Admin", "Admin"), handleStartRegistration);

const handleCloseRegistration = async (req: any, res: any) => {
  const competitionId = id(req.params.id);
  if (!competitionId) {
    res.status(400).json({ error: "Invalid competition id" });
    return;
  }

  const c = (await db.select().from(competitionsTable).where(eq(competitionsTable.id, competitionId)).limit(1))[0];
  if (!c) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  const currStatus = String(c.status).toLowerCase();
  if (currStatus !== "registration_open") {
    res.status(400).json({ error: `Cannot close registration from state '${c.status}'. Registration can only be closed from REGISTRATION_OPEN state.` });
    return;
  }

  const [updated] = await db.update(competitionsTable).set({ status: "registration_closed" }).where(eq(competitionsTable.id, competitionId)).returning();
  res.json({ message: "Registration closed successfully.", competition: updated });
};

router.post("/admin/competitions/:id/close-registration", requireRole("Super Admin", "Admin"), handleCloseRegistration);
router.post("/competitions/:id/close-registration", requireRole("Super Admin", "Admin"), handleCloseRegistration);

const handleStartVoting = async (req: any, res: any) => {
  const competitionId = id(req.params.id);
  if (!competitionId) {
    res.status(400).json({ error: "Invalid competition id" });
    return;
  }

  const c = (await db.select().from(competitionsTable).where(eq(competitionsTable.id, competitionId)).limit(1))[0];
  if (!c) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  const currStatus = String(c.status).toLowerCase();
  if (currStatus !== "registration_closed") {
    res.status(400).json({ error: `Cannot start voting from state '${c.status}'. Voting can only be started from REGISTRATION_CLOSED state.` });
    return;
  }

  const [updated] = await db.update(competitionsTable).set({ status: "voting_open" }).where(eq(competitionsTable.id, competitionId)).returning();
  res.json({ message: "Voting started successfully.", competition: updated });
};

router.post("/admin/competitions/:id/start-voting", requireRole("Super Admin", "Admin"), handleStartVoting);
router.post("/competitions/:id/start-voting", requireRole("Super Admin", "Admin"), handleStartVoting);

const handleStopVoting = async (req: any, res: any) => {
  const competitionId = id(req.params.id);
  if (!competitionId) {
    res.status(400).json({ error: "Invalid competition id" });
    return;
  }

  const c = (await db.select().from(competitionsTable).where(eq(competitionsTable.id, competitionId)).limit(1))[0];
  if (!c) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  const currStatus = String(c.status).toLowerCase();
  if (currStatus !== "voting_open") {
    res.status(400).json({ error: `Cannot stop voting from state '${c.status}'. Voting can only be stopped from VOTING_OPEN state.` });
    return;
  }

  const [updated] = await db.update(competitionsTable).set({ status: "voting_closed" }).where(eq(competitionsTable.id, competitionId)).returning();
  res.json({ message: "Voting stopped successfully.", competition: updated });
};

router.post("/admin/competitions/:id/stop-voting", requireRole("Super Admin", "Admin"), handleStopVoting);
router.post("/competitions/:id/stop-voting", requireRole("Super Admin", "Admin"), handleStopVoting);

const handlePublishResults = async (req: any, res: any) => {
  const competitionId = id(req.params.id);
  if (!competitionId) {
    res.status(400).json({ error: "Invalid competition id" });
    return;
  }

  const c = (await db.select().from(competitionsTable).where(eq(competitionsTable.id, competitionId)).limit(1))[0];
  if (!c) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  const currStatus = String(c.status).toLowerCase();
  if (currStatus !== "voting_closed") {
    res.status(400).json({ error: `Cannot publish results from state '${c.status}'. Results can only be published from VOTING_CLOSED state.` });
    return;
  }

  const [updated] = await db
    .update(competitionsTable)
    .set({ status: "completed", resultsPublished: 1 })
    .where(eq(competitionsTable.id, competitionId))
    .returning();

  res.json({ message: "Results published successfully.", competition: updated });
};

router.post("/admin/competitions/:id/publish-results", requireRole("Super Admin", "Admin"), handlePublishResults);
router.post("/competitions/:id/publish-results", requireRole("Super Admin", "Admin"), handlePublishResults);
const handleEntryDecision = async (req: any, res: any) => {
  try {
    const rawCompId = req.params.competitionId || req.params.id;
    const rawEntryId = req.params.entryId || (req.params.competitionId ? null : req.params.id);

    const competitionId = id(rawCompId);
    const entryId = id(rawEntryId || req.params.id);
    const decision = String(req.params.decision || "").toLowerCase();

    if (!["approve", "reject"].includes(decision)) {
      res.status(400).json({ error: "Invalid entry action" });
      return;
    }

    if (competitionId) {
      const [comp] = await db
        .select({ id: competitionsTable.id })
        .from(competitionsTable)
        .where(eq(competitionsTable.id, competitionId))
        .limit(1);

      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }
    }

    if (!entryId) {
      res.status(400).json({ error: "Invalid entry ID" });
      return;
    }

    const [entry] = await db
      .select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.id, entryId))
      .limit(1);

    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    if (competitionId && entry.competitionId !== competitionId) {
      res.status(400).json({ error: "Entry does not belong to this competition" });
      return;
    }

    const adminId = req.admin?.id || null;
    const reviewNote =
      typeof req.body?.reviewNote === "string"
        ? req.body.reviewNote.trim().slice(0, 1000)
        : null;

    const [updated] = await db
      .update(competitionEntriesTable)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        reviewedByAdminId: adminId,
        reviewNote,
        updatedAt: new Date(),
      })
      .where(eq(competitionEntriesTable.id, entryId))
      .returning();

    res.json(updated);
  } catch (err: any) {
    console.error("Entry decision error:", err);
    res.status(500).json({ error: err?.message || "Failed to update entry status" });
  }
};

router.post("/admin/competitions/:competitionId/entries/:entryId/approve", requireRole("Super Admin", "Admin"), (req, res) => {
  req.params.decision = "approve";
  return handleEntryDecision(req, res);
});

router.post("/admin/competitions/:competitionId/entries/:entryId/reject", requireRole("Super Admin", "Admin"), (req, res) => {
  req.params.decision = "reject";
  return handleEntryDecision(req, res);
});

router.patch("/admin/competitions/:competitionId/entries/:entryId/approve", requireRole("Super Admin", "Admin"), (req, res) => {
  req.params.decision = "approve";
  return handleEntryDecision(req, res);
});

router.patch("/admin/competitions/:competitionId/entries/:entryId/reject", requireRole("Super Admin", "Admin"), (req, res) => {
  req.params.decision = "reject";
  return handleEntryDecision(req, res);
});

router.post("/admin/competitions/:id/entries/:entryId/:decision", requireRole("Super Admin", "Admin"), handleEntryDecision);
router.patch("/admin/competitions/:id/entries/:entryId/:decision", requireRole("Super Admin", "Admin"), handleEntryDecision);
router.post("/admin/competition-entries/:id/:decision", requireRole("Super Admin", "Admin"), handleEntryDecision);
router.patch("/admin/competition-entries/:id/:decision", requireRole("Super Admin", "Admin"), handleEntryDecision);
router.get("/admin/competitions/:id/results",requireRole("Super Admin","Admin"),async(req,res)=>{const competitionId=id(req.params.id);if(!competitionId){res.status(400).json({error:"Invalid competition id"});return;}res.json(await db.select({entryId:competitionEntriesTable.id,title:competitionEntriesTable.title,participant:residentsTable.fullName,votes:sql<number>`COUNT(${competitionVotesTable.id})::int`}).from(competitionEntriesTable).innerJoin(residentsTable,eq(competitionEntriesTable.residentId,residentsTable.id)).leftJoin(competitionVotesTable,eq(competitionVotesTable.entryId,competitionEntriesTable.id)).where(and(eq(competitionEntriesTable.competitionId,competitionId),eq(competitionEntriesTable.status,"approved"))).groupBy(competitionEntriesTable.id,residentsTable.fullName).orderBy(desc(sql`COUNT(${competitionVotesTable.id})`)))});

const handleDeleteCompetition = async (req: any, res: any) => {
  try {
    const competitionId = id(req.params.id);
    if (!competitionId) {
      res.status(400).json({ error: "Invalid competition id" });
      return;
    }

    const [c] = await db
      .select({ id: competitionsTable.id })
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .limit(1);

    if (!c) {
      res.status(404).json({ error: "Competition not found" });
      return;
    }

    // Get associated entry images to delete Cloudinary assets if configured
    const imageRows = await db
      .select({ publicId: competitionEntryImagesTable.cloudinaryPublicId })
      .from(competitionEntryImagesTable)
      .innerJoin(
        competitionEntriesTable,
        eq(competitionEntryImagesTable.entryId, competitionEntriesTable.id)
      )
      .where(eq(competitionEntriesTable.competitionId, competitionId));

    if (isCloudinaryConfigured && imageRows.length > 0) {
      for (const img of imageRows) {
        if (img.publicId) {
          try {
            await cloudinary.uploader.destroy(img.publicId);
          } catch (err) {
            console.warn(`Failed to delete Cloudinary asset ${img.publicId}:`, err);
          }
        }
      }
    }

    // Transactional deletion of related competition data in correct order
    await db.transaction(async (tx) => {
      await tx
        .delete(competitionSecurityAttemptsTable)
        .where(eq(competitionSecurityAttemptsTable.competitionId, competitionId));

      await tx
        .delete(competitionVotesTable)
        .where(eq(competitionVotesTable.competitionId, competitionId));

      const entries = await tx
        .select({ id: competitionEntriesTable.id })
        .from(competitionEntriesTable)
        .where(eq(competitionEntriesTable.competitionId, competitionId));

      const entryIds = entries.map((e) => e.id);
      if (entryIds.length > 0) {
        await tx
          .delete(competitionEntryImagesTable)
          .where(sql`${competitionEntryImagesTable.entryId} IN (${sql.join(entryIds, sql`, `)})`);
      }

      await tx
        .delete(competitionEntriesTable)
        .where(eq(competitionEntriesTable.competitionId, competitionId));

      await tx
        .delete(competitionWinnersTable)
        .where(eq(competitionWinnersTable.competitionId, competitionId));

      await tx
        .delete(competitionRegistrationsTable)
        .where(eq(competitionRegistrationsTable.competitionId, competitionId));

      await tx
        .delete(competitionsTable)
        .where(eq(competitionsTable.id, competitionId));
    });

    res.json({ message: "Competition deleted successfully." });
  } catch (error: any) {
    console.error("DELETE competition failed:", error);
    res.status(500).json({ error: error?.message || "Failed to delete competition." });
  }
};

router.delete("/admin/competitions/:id", requireRole("Super Admin", "Admin"), handleDeleteCompetition);
router.delete("/competitions/:id", requireRole("Super Admin", "Admin"), handleDeleteCompetition);

export default router;
