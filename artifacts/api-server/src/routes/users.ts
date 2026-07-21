import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, desc, ilike, and } from "drizzle-orm";
import { ListUsersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const params = ListUsersQueryParams.safeParse(req.query);
  const search = params.success ? params.data.search : undefined;

  let conditions: any[] = [];
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));

  const users = await db
    .select()
    .from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(usersTable.createdAt));

  res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

export default router;

