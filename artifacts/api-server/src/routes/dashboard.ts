import { Router, type IRouter } from "express";
import { eq, and, lt, count, isNotNull } from "drizzle-orm";
import { db, usersTable, projectsTable, projectMembersTable, tasksTable, activityTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetMyTasksResponse,
  GetOverdueTasksResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "./auth";
import { getAuth } from "@clerk/express";
import { sql } from "drizzle-orm";

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

router.get("/dashboard/summary", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getCurrentUser(req);

  const [totalProjectsResult] = await db.select({ count: count() }).from(projectsTable);
  const [activeProjectsResult] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "active"));
  const [totalTasksResult] = await db.select({ count: count() }).from(tasksTable);
  const [myTasksResult] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.assigneeId, user.id));
  const [completedTasksResult] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "done"));
  const [overdueTasksResult] = await db.select({ count: count() }).from(tasksTable).where(
    and(
      lt(tasksTable.dueDate, new Date()),
      sql`${tasksTable.status} != 'done'`,
      isNotNull(tasksTable.dueDate)
    )
  );

  const [todoCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "todo"));
  const [inProgressCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "in_progress"));
  const [inReviewCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "in_review"));
  const [doneCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "done"));

  const [lowCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.priority, "low"));
  const [mediumCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.priority, "medium"));
  const [highCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.priority, "high"));
  const [urgentCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.priority, "urgent"));

  const summary = {
    totalProjects: totalProjectsResult.count,
    activeProjects: activeProjectsResult.count,
    totalTasks: totalTasksResult.count,
    myTasks: myTasksResult.count,
    completedTasks: completedTasksResult.count,
    overdueTasks: overdueTasksResult.count,
    tasksByStatus: {
      todo: todoCount.count,
      in_progress: inProgressCount.count,
      in_review: inReviewCount.count,
      done: doneCount.count,
    },
    tasksByPriority: {
      low: lowCount.count,
      medium: mediumCount.count,
      high: highCount.count,
      urgent: urgentCount.count,
    },
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/my-tasks", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getCurrentUser(req);
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, user.id));
  const enriched = await Promise.all(tasks.map(buildTask));
  res.json(GetMyTasksResponse.parse(enriched));
});

router.get("/dashboard/overdue-tasks", requireAuth, async (req: any, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable).where(
    and(
      lt(tasksTable.dueDate, new Date()),
      sql`${tasksTable.status} != 'done'`,
      isNotNull(tasksTable.dueDate)
    )
  );
  const enriched = await Promise.all(tasks.map(buildTask));
  res.json(GetOverdueTasksResponse.parse(enriched));
});

router.get("/dashboard/activity", requireAuth, async (_req, res): Promise<void> => {
  const activities = await db
    .select()
    .from(activityTable)
    .orderBy(sql`${activityTable.createdAt} DESC`)
    .limit(20);

  const enriched = await Promise.all(activities.map(async (a) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, a.userId));
    let projectName = null;
    if (a.projectId) {
      const [project] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, a.projectId));
      projectName = project?.name ?? null;
    }
    let taskTitle = null;
    if (a.taskId) {
      const [task] = await db.select({ title: tasksTable.title }).from(tasksTable).where(eq(tasksTable.id, a.taskId));
      taskTitle = task?.title ?? null;
    }
    return {
      ...a,
      userName: user?.name ?? "Unknown",
      projectName,
      taskTitle,
    };
  }));

  res.json(GetRecentActivityResponse.parse(enriched));
});

export default router;
