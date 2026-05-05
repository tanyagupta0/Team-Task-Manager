import { Router, type IRouter } from "express";
import { eq, and, isNotNull } from "drizzle-orm";
import { db, usersTable, projectsTable, tasksTable, activityTable } from "@workspace/db";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
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

async function buildTask(task: typeof tasksTable.$inferSelect) {
  const [project] = await db.select({ id: projectsTable.id, name: projectsTable.name, color: projectsTable.color }).from(projectsTable).where(eq(projectsTable.id, task.projectId));
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, task.creatorId));
  let assignee = null;
  if (task.assigneeId) {
    const [a] = await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId));
    assignee = a ?? null;
  }
  return { ...task, project, creator, assignee };
}

router.get("/tasks", requireAuth, async (req: any, res): Promise<void> => {
  const queryParams = ListTasksQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { projectId, assigneeId, status, priority } = queryParams.data;
  const conditions = [];
  if (projectId) conditions.push(eq(tasksTable.projectId, projectId));
  if (assigneeId) conditions.push(eq(tasksTable.assigneeId, assigneeId));
  if (status) conditions.push(eq(tasksTable.status, status));
  if (priority) conditions.push(eq(tasksTable.priority, priority));

  const tasks = conditions.length > 0
    ? await db.select().from(tasksTable).where(and(...conditions))
    : await db.select().from(tasksTable);

  const enriched = await Promise.all(tasks.map(buildTask));
  res.json(ListTasksResponse.parse(enriched));
});

router.post("/tasks", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getCurrentUser(req);
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db
    .insert(tasksTable)
    .values({ ...parsed.data, creatorId: user.id })
    .returning();

  await db.insert(activityTable).values({
    type: "task_created",
    description: `created task "${task.title}"`,
    userId: user.id,
    projectId: task.projectId,
    taskId: task.id,
  });

  const enriched = await buildTask(task);
  res.status(201).json(GetTaskResponse.parse(enriched));
});

router.get("/tasks/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const enriched = await buildTask(task);
  res.json(GetTaskResponse.parse(enriched));
});

router.patch("/tasks/:id", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getCurrentUser(req);
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: any = { ...parsed.data };
  if (parsed.data.status === "done") {
    updateData.completedAt = new Date();
  } else if (parsed.data.status) {
    updateData.completedAt = null;
  }

  const [updated] = await db
    .update(tasksTable)
    .set(updateData)
    .where(eq(tasksTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (parsed.data.status === "done") {
    await db.insert(activityTable).values({
      type: "task_completed",
      description: `completed task "${updated.title}"`,
      userId: user.id,
      projectId: updated.projectId,
      taskId: updated.id,
    });
  } else if (parsed.data.status || parsed.data.title) {
    await db.insert(activityTable).values({
      type: "task_updated",
      description: `updated task "${updated.title}"`,
      userId: user.id,
      projectId: updated.projectId,
      taskId: updated.id,
    });
  }

  const enriched = await buildTask(updated);
  res.json(UpdateTaskResponse.parse(enriched));
});

router.delete("/tasks/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
