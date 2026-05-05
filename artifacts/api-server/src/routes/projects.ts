import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, usersTable, projectsTable, projectMembersTable, tasksTable } from "@workspace/db";
import {
  ListProjectsResponse,
  CreateProjectBody,
  GetProjectResponse,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
  ListProjectMembersResponse,
  ListProjectMembersParams,
  AddProjectMemberParams,
  AddProjectMemberBody,
  RemoveProjectMemberParams,
  UpdateProjectMemberRoleParams,
  UpdateProjectMemberRoleBody,
  UpdateProjectMemberRoleResponse,
} from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "./auth";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

async function getCurrentUser(req: any) {
  const auth = getAuth(req);
  const clerkId = auth?.userId!;
  const email = (auth as any)?.sessionClaims?.email ?? "";
  const name = (auth as any)?.sessionClaims?.name ?? email;
  return getOrCreateUser(clerkId, email, name);
}

async function getProjectWithCounts(projectId: number) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return null;

  const [taskCountResult] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId));
  const [completedCountResult] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.status, "done")));
  const [memberCountResult] = await db
    .select({ count: count() })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.projectId, projectId));

  return {
    ...project,
    taskCount: taskCountResult.count,
    completedTaskCount: completedCountResult.count,
    memberCount: memberCountResult.count,
  };
}

router.get("/projects", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getCurrentUser(req);
  const memberRows = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, user.id));

  const ownedProjects = await db.select().from(projectsTable).where(eq(projectsTable.ownerId, user.id));
  const memberProjectIds = memberRows.map((r) => r.projectId);
  const memberProjects = memberProjectIds.length > 0
    ? await db.select().from(projectsTable).where(sql`${projectsTable.id} IN ${memberProjectIds}`)
    : [];

  const allProjectIds = new Set([...ownedProjects.map(p => p.id), ...memberProjects.map(p => p.id)]);
  const projects = await Promise.all([...allProjectIds].map(id => getProjectWithCounts(id)));
  const validProjects = projects.filter(Boolean);

  res.json(ListProjectsResponse.parse(validProjects));
});

router.post("/projects", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getCurrentUser(req);
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({ ...parsed.data, ownerId: user.id })
    .returning();

  await db.insert(projectMembersTable).values({ projectId: project.id, userId: user.id, role: "admin" });

  const projectWithCounts = await getProjectWithCounts(project.id);
  res.status(201).json(GetProjectResponse.parse(projectWithCounts));
});

router.get("/projects/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await getProjectWithCounts(params.data.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(project));
});

router.patch("/projects/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const projectWithCounts = await getProjectWithCounts(updated.id);
  res.json(UpdateProjectResponse.parse(projectWithCounts));
});

router.delete("/projects/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

// Members
router.get("/projects/:id/members", requireAuth, async (req: any, res): Promise<void> => {
  const params = ListProjectMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db
    .select()
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, params.data.id));

  const result = members.map((m) => ({
    ...m.project_members,
    user: m.users,
  }));

  res.json(ListProjectMembersResponse.parse(result));
});

router.post("/projects/:id/members", requireAuth, async (req: any, res): Promise<void> => {
  const params = AddProjectMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .insert(projectMembersTable)
    .values({ projectId: params.data.id, userId: parsed.data.userId, role: parsed.data.role })
    .returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId));
  res.status(201).json({ ...member, user });
});

router.delete("/projects/:id/members/:memberId", requireAuth, async (req: any, res): Promise<void> => {
  const params = RemoveProjectMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.id, params.data.memberId)));
  res.sendStatus(204);
});

router.patch("/projects/:id/members/:memberId", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateProjectMemberRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectMemberRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(projectMembersTable)
    .set({ role: parsed.data.role })
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.id, params.data.memberId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json(UpdateProjectMemberRoleResponse.parse({ ...updated, user }));
});

export default router;
