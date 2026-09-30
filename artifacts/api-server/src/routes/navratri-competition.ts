import { Router, type IRouter } from "express";
import { db, navratriCompetitionContentTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();
const defaultRuleSections = [
  { key: "photography", title: "Photography Rules", eventId: null, content: "", displayOrder: 1, enabled: true },
  { key: "reels", title: "Reel Competition Rules", eventId: null, content: "", displayOrder: 2, enabled: true },
  { key: "videography", title: "Videography Rules", eventId: null, content: "", displayOrder: 3, enabled: true },
];
const googleFormUrl = z.string().trim().url().refine((value) => /^https:\/\/(?:docs\.google\.com\/forms\/|forms\.gle\/)/i.test(value), "Please enter a valid Google Forms URL.");
const contentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  introduction: z.string().trim().min(1).max(2000),
  rules: z.array(z.string().trim().min(1).max(1000)).max(100).optional(),
  generalRules: z.string().max(20000).optional(),
  ruleSections: z.array(z.object({ key: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(160), eventId: z.number().int().positive().nullable(), content: z.string().max(20000), displayOrder: z.number().int().min(0), enabled: z.boolean() })).max(100).optional(),
  googleFormUrl: z.union([googleFormUrl, z.literal("")]).nullable().optional(),
  contactName: z.string().trim().min(1).max(160),
  contactPhone: z.string().trim().min(1).max(80),
  contactEmail: z.string().trim().email().max(160),
});

const publicFields = {
  title: navratriCompetitionContentTable.title,
  introduction: navratriCompetitionContentTable.introduction,
  generalRules: navratriCompetitionContentTable.generalRules,
  ruleSections: navratriCompetitionContentTable.ruleSections,
  googleFormUrl: navratriCompetitionContentTable.googleFormUrl,
  contactName: navratriCompetitionContentTable.contactName,
  contactPhone: navratriCompetitionContentTable.contactPhone,
  contactEmail: navratriCompetitionContentTable.contactEmail,
};

async function getContent() {
  const [content] = await db.select(publicFields).from(navratriCompetitionContentTable).orderBy(desc(navratriCompetitionContentTable.id)).limit(1);
  if (!content) return {
    title: "Navratri 2026 Competition",
    introduction: "Participate. Create. Celebrate. Join the Meditiya Sathi Navratri 2026 competition and share your festive spirit with our community.",
    generalRules: "", ruleSections: defaultRuleSections, googleFormUrl: null, contactName: "Meditiya Mitra Mandal", contactPhone: "+91 8108388000", contactEmail: "medtiyasathi@gmail.com",
  };
  return { ...content, ruleSections: content.ruleSections?.length ? content.ruleSections : defaultRuleSections };
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
    const current = await getContent();
    const [existing] = await db.select({ id: navratriCompetitionContentTable.id, rules: navratriCompetitionContentTable.rules }).from(navratriCompetitionContentTable).orderBy(desc(navratriCompetitionContentTable.id)).limit(1);
    const value = { title: parsed.data.title, introduction: parsed.data.introduction, rules: parsed.data.rules ?? existing?.rules ?? [], generalRules: parsed.data.generalRules ?? current.generalRules ?? "", ruleSections: parsed.data.ruleSections ?? current.ruleSections ?? defaultRuleSections, googleFormUrl: parsed.data.googleFormUrl === undefined ? current.googleFormUrl : (parsed.data.googleFormUrl || null), contactName: parsed.data.contactName, contactPhone: parsed.data.contactPhone, contactEmail: parsed.data.contactEmail, updatedAt: new Date() };
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
