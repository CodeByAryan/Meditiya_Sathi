import { Router, type IRouter } from "express";
import { db, navratriCompetitionContentTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();
const googleFormUrl = z.string().trim().url().refine((value) => /^https:\/\/(?:docs\.google\.com\/forms\/|forms\.gle\/)/i.test(value), "Please enter a valid Google Forms URL.");
const contentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  introduction: z.string().trim().min(1).max(2000),
  rules: z.array(z.string().trim().min(1).max(1000)).max(100),
  googleFormUrl: z.union([googleFormUrl, z.literal("")]).nullable().optional(),
  contactName: z.string().trim().min(1).max(160),
  contactPhone: z.string().trim().min(1).max(80),
  contactEmail: z.string().trim().email().max(160),
});

const publicFields = {
  title: navratriCompetitionContentTable.title,
  introduction: navratriCompetitionContentTable.introduction,
  rules: navratriCompetitionContentTable.rules,
  googleFormUrl: navratriCompetitionContentTable.googleFormUrl,
  contactName: navratriCompetitionContentTable.contactName,
  contactPhone: navratriCompetitionContentTable.contactPhone,
  contactEmail: navratriCompetitionContentTable.contactEmail,
};

async function getContent() {
  const [content] = await db.select(publicFields).from(navratriCompetitionContentTable).orderBy(desc(navratriCompetitionContentTable.id)).limit(1);
  return content || {
    title: "Navratri 2026 Competition",
    introduction: "Participate. Create. Celebrate. Join the Meditiya Sathi Navratri 2026 competition and share your festive spirit with our community.",
    rules: [], googleFormUrl: null, contactName: "Meditiya Mitra Mandal", contactPhone: "+91 8108388000", contactEmail: "medtiyasathi@gmail.com",
  };
}

router.get("/navratri-competition", async (_req, res) => {
  try {
    res.json(await getContent());
  } catch (error) {
    console.error("[Navratri Competition] Public GET failed:", error);
    res.status(500).json({ error: "Unable to load competition information." });
  }
});

router.get("/admin/navratri-competition", requireRole("Super Admin", "Admin"), async (req, res) => {
  try {
    res.json(await getContent());
  } catch (error) {
    const admin = (req as any).admin;
    console.error("[Navratri Competition] Admin GET failed:", {
      error,
      adminId: admin?.id,
      adminRole: admin?.role,
    });
    res.status(500).json({ error: "Unable to load competition content." });
  }
});

router.patch("/admin/navratri-competition", requireRole("Super Admin", "Admin"), async (req, res) => {
  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid competition content." }); return; }
  try {
    const value = { ...parsed.data, googleFormUrl: parsed.data.googleFormUrl || null, updatedAt: new Date() };
    const [existing] = await db.select({ id: navratriCompetitionContentTable.id }).from(navratriCompetitionContentTable).orderBy(desc(navratriCompetitionContentTable.id)).limit(1);
    const [saved] = existing
      ? await db.update(navratriCompetitionContentTable).set(value).where(eq(navratriCompetitionContentTable.id, existing.id)).returning(publicFields)
      : await db.insert(navratriCompetitionContentTable).values(value).returning(publicFields);
    res.json(saved);
  } catch (error) {
    const admin = (req as any).admin;
    console.error("[Navratri Competition] Admin PATCH failed:", {
      error,
      adminId: admin?.id,
      adminRole: admin?.role,
    });
    res.status(500).json({ error: "Unable to save competition content." });
  }
});

export default router;
