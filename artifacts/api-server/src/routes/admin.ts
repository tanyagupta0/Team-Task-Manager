import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { AdminCreateUserBody } from "@workspace/api-zod";
import { requireAuth } from "./auth";
import { getAuth, createClerkClient } from "@clerk/express";

const router: IRouter = Router();

function getClerkClient() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
}

router.post("/admin/create-user", requireAuth, async (req: any, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId!;
  const [requester] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  if (!requester || requester.role !== "admin") {
    res.status(403).json({ error: "Only admins can create users" });
    return;
  }

  const parsed = AdminCreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, firstName, lastName, password, role } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();

  const clerk = getClerkClient();

  // --- Try to create the user in Clerk ---
  let clerkUser;
  try {
    clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password,
      skipPasswordChecks: false,
    });
  } catch (err: any) {
    const clerkError = err?.errors?.[0];
    const isAlreadyExists =
      clerkError?.code === "form_identifier_exists" ||
      clerkError?.message?.toLowerCase().includes("already") ||
      err?.status === 422;

    if (isAlreadyExists) {
      // User exists in Clerk — look them up and sync to our DB
      try {
        const clerkUsers = await clerk.users.getUserList({
          emailAddress: [email],
          limit: 1,
        });

        if (clerkUsers.totalCount === 0) {
          res.status(409).json({ error: "Email already registered but could not be found in the auth system." });
          return;
        }

        const existingClerkUser = clerkUsers.data[0];

        // Check if already in our DB
        const [alreadyInDb] = await db
          .select()
          .from(usersTable)
          .where(
            or(
              eq(usersTable.clerkId, existingClerkUser.id),
              eq(usersTable.email, email),
            )
          );

        if (alreadyInDb) {
          res.status(409).json({ error: "This user already exists in the app. They can log in directly." });
          return;
        }

        // Sync: create DB record for existing Clerk user
        const [synced] = await db
          .insert(usersTable)
          .values({ clerkId: existingClerkUser.id, email, name, role })
          .returning();

        req.log.info({ clerkId: existingClerkUser.id }, "Synced existing Clerk user to DB");
        res.status(201).json(synced);
        return;
      } catch (syncErr: any) {
        req.log.error({ syncErr }, "Failed to sync existing Clerk user");
        res.status(409).json({ error: "Email is already registered. Try a different email." });
        return;
      }
    }

    // Some other Clerk error
    req.log.error({ err }, "Clerk user creation failed");
    const msg = clerkError?.longMessage ?? clerkError?.message ?? "Failed to create user. Please try again.";
    res.status(500).json({ error: msg });
    return;
  }

  // --- Clerk user created — now save to our DB ---
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUser.id));

  if (existing) {
    res.status(201).json(existing);
    return;
  }

  const [created] = await db
    .insert(usersTable)
    .values({ clerkId: clerkUser.id, email, name, role })
    .returning();

  res.status(201).json(created);
});

export default router;
