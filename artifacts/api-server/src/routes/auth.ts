import { Router, type IRouter } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { eq, count } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export function requireAuth(req: any, res: any, next: any): void {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkId = clerkId;
  next();
}

function getClerkClient() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
}

export async function getOrCreateUser(
  clerkId: string,
  emailFromClaim: string,
  nameFromClaim: string,
): Promise<typeof usersTable.$inferSelect> {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing) {
    // If email was blank (old record), try to backfill it from Clerk
    if (!existing.email && clerkId) {
      try {
        const clerk = getClerkClient();
        const clerkUser = await clerk.users.getUser(clerkId);
        const primaryEmail = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? "";
        const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || primaryEmail;
        if (primaryEmail) {
          const [updated] = await db
            .update(usersTable)
            .set({ email: primaryEmail, name: fullName || existing.name })
            .where(eq(usersTable.clerkId, clerkId))
            .returning();
          return updated;
        }
      } catch (_) {
        // Non-fatal: keep existing record
      }
    }
    return existing;
  }

  // New user — fetch real email from Clerk API for accuracy
  let email = emailFromClaim;
  let name = nameFromClaim;
  try {
    const clerk = getClerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? emailFromClaim;
    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      primaryEmail;
    email = primaryEmail;
    name = fullName || nameFromClaim || email;
  } catch (_) {
    // Fall back to session claims if Clerk API fails
  }

  // First user ever becomes admin
  const [{ total }] = await db.select({ total: count() }).from(usersTable);
  const role = total === 0 ? "admin" : "member";
  const [created] = await db.insert(usersTable).values({ clerkId, email, name, role }).returning();
  return created;
}

const router: IRouter = Router();
export default router;
