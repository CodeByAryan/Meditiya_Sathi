import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

function parseRole(input: unknown): "admin" | "resident" | "volunteer" {
  const allowed = new Set(["admin", "resident", "volunteer"]);
  const v = (input as any)?.role;
  if (typeof v === "string" && allowed.has(v)) return v as any;
  return "admin";
}

router.post("/admin/users/:clerkUserId/role", requireAdmin(), async (req, res): Promise<void> => {
  const clerkUserId = req.params.clerkUserId!;
  if (!clerkUserId) { res.status(400).json({ error: "Missing clerkUserId" }); return; }

  const role = parseRole(req.body);

  const [updated] = await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: (updated as any).updatedAt?.toISOString?.() ?? updated.createdAt.toISOString(),
  });
});

export default router;

