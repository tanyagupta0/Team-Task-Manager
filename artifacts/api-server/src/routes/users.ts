import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetMeResponse, UpdateMeBody, UpdateMeResponse, ListUsersResponse, UpdateUserRoleBody } from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "./auth";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req: any, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId!;
  const email = (auth as any)?.sessionClaims?.email ?? "";
  const name = (auth as any)?.sessionClaims?.name ?? email;
  const user = await getOrCreateUser(clerkId, email, name);
  res.json(GetMeResponse.parse(user));
});

router.patch("/users/me", requireAuth, async (req: any, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId!;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.clerkId, clerkId))
    .returning();
  res.json(UpdateMeResponse.parse(updated));
});

router.get("/users", requireAuth, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(ListUsersResponse.parse(users));
});

router.patch("/users/:id/role", requireAuth, async (req: any, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId!;
  const [requester] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!requester || requester.role !== "admin") {
    res.status(403).json({ error: "Only admins can change user roles" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = parseInt(raw, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  if (requester.id === userId) {
    res.status(400).json({ error: "You cannot change your own role" });
    return;
  }

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role: parsed.data.role })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

export default router;
