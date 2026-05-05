import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProject,
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjectMembers,
  useListUsers,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  useRemoveProjectMember,
  getListTasksQueryKey,
  getGetProjectQueryKey,
  getListProjectMembersQueryKey,
  getListProjectsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMyTasksQueryKey,
  getGetOverdueTasksQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Plus, ArrowLeft, CalendarIcon, Circle, CheckCircle2, MoreHorizontal,
  Trash2, Users, Loader2, ChevronDown, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const STATUSES = [
  { value: "todo", label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "in_review", label: "In Review", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "done", label: "Done", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeId: z.coerce.number().optional().nullable(),
  dueDate: z.date().optional().nullable(),
});
type CreateTaskValues = z.infer<typeof createTaskSchema>;

function priorityDot(priority: string) {
  switch (priority) {
    case "urgent": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-blue-500";
    default: return "bg-slate-400";
  }
}

function invalidateAll(projectId: number) {
  queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
  queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
  queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetOverdueTasksQueryKey() });
  queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
}

export function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectId = Number(params.id);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [tab, setTab] = useState("board");

  const { data: project, isLoading: loadingProject } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: tasks, isLoading: loadingTasks } = useListTasks(
    { projectId },
    { query: { queryKey: getListTasksQueryKey({ projectId }) } }
  );
  const { data: members } = useListProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectMembersQueryKey(projectId) },
  });
  const { data: users } = useListUsers();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const deleteProject = useDeleteProject();

  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: (selectedStatus as any) || "todo",
      priority: "medium",
      assigneeId: null,
      dueDate: null,
    },
  });

  function openTaskDialog(status?: string) {
    const s = status || "todo";
    setSelectedStatus(s);
    form.reset({ title: "", description: "", status: s as any, priority: "medium", assigneeId: null, dueDate: null });
    setTaskDialogOpen(true);
  }

  function onSubmitTask(data: CreateTaskValues) {
    createTask.mutate(
      {
        data: {
          title: data.title,
          description: data.description || null,
          status: data.status,
          priority: data.priority,
          projectId,
          assigneeId: data.assigneeId || null,
          dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          setTaskDialogOpen(false);
          form.reset();
          invalidateAll(projectId);
          toast({ title: "Task created" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
        },
      }
    );
  }

  function toggleComplete(task: { id: number; status: string; title: string }) {
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTask.mutate(
      { id: task.id, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          invalidateAll(projectId);
          toast({ title: newStatus === "done" ? "Task completed!" : "Task reopened" });
        },
      }
    );
  }

  function changeStatus(taskId: number, status: string) {
    updateTask.mutate(
      { id: taskId, data: { status: status as any } },
      { onSuccess: () => { invalidateAll(projectId); } }
    );
  }

  function handleDeleteTask(taskId: number) {
    deleteTask.mutate(
      { id: taskId },
      {
        onSuccess: () => {
          invalidateAll(projectId);
          toast({ title: "Task deleted" });
        },
      }
    );
  }

  function handleDeleteProject() {
    if (!confirm("Delete this project and all its tasks? This cannot be undone.")) return;
    deleteProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setLocation("/projects");
          toast({ title: "Project deleted" });
        },
      }
    );
  }

  const [addMemberUserId, setAddMemberUserId] = useState<string>("");
  const [addMemberRole, setAddMemberRole] = useState<"admin" | "member">("member");

  function handleAddMember() {
    if (!addMemberUserId) return;
    addMember.mutate(
      { id: projectId, data: { userId: Number(addMemberUserId), role: addMemberRole } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          setAddMemberOpen(false);
          setAddMemberUserId("");
          toast({ title: "Member added" });
        },
        onError: () => {
          toast({ title: "Error", description: "Could not add member.", variant: "destructive" });
        },
      }
    );
  }

  function handleRemoveMember(memberId: number) {
    removeMember.mutate(
      { id: projectId, memberId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          toast({ title: "Member removed" });
        },
      }
    );
  }

  const isOverdue = (task: { dueDate?: string | null; status: string }) =>
    task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();

  const tasksByStatus = (status: string) => tasks?.filter((t) => t.status === status) ?? [];

  if (loadingProject) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-96 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-medium">Project not found</h3>
        <Link href="/projects"><Button className="mt-4">Back to Projects</Button></Link>
      </div>
    );
  }

  const nonMembers = users?.filter(
    (u) => !members?.some((m) => m.userId === u.id)
  ) ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="btn-back-projects">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => openTaskDialog()} data-testid="btn-new-task-project">
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="btn-project-menu">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTab("members")}>
                <Users className="w-4 h-4 mr-2" /> Manage Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400"
                onClick={handleDeleteProject}
                data-testid="btn-delete-project"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {project.completedTaskCount}/{project.taskCount} tasks done
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-blue-500" />
          {project.memberCount} members
        </span>
        <Badge
          variant="outline"
          className={`capitalize ${project.status === "active" ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-slate-300"}`}
        >
          {project.status}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="board" data-testid="tab-board">Board</TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-list">List</TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="w-4 h-4 mr-1.5" /> Members ({members?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ---- BOARD VIEW ---- */}
        <TabsContent value="board">
          {loadingTasks ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {STATUSES.map((col) => {
                const colTasks = tasksByStatus(col.value);
                return (
                  <div key={col.value} className="flex flex-col rounded-xl border bg-slate-50/60 dark:bg-slate-900/60 p-3 min-h-[200px]">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${col.color}`}>
                        {col.label}
                      </span>
                      <span className="text-xs text-slate-400">{colTasks.length}</span>
                    </div>

                    <div className="flex-1 space-y-2">
                      {colTasks.map((task) => (
                        <div
                          key={task.id}
                          data-testid={`task-card-${task.id}`}
                          className={`group p-3 rounded-lg border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all ${
                            isOverdue(task) ? "border-l-4 border-l-red-400" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <button
                              onClick={() => toggleComplete(task)}
                              className="mt-0.5 shrink-0"
                              data-testid={`btn-complete-${task.id}`}
                            >
                              {task.status === "done" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-300 hover:text-emerald-500 transition-colors" />
                              )}
                            </button>
                            <p className={`flex-1 text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                              {task.title}
                            </p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" data-testid={`btn-task-menu-${task.id}`}>
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {STATUSES.filter((s) => s.value !== task.status).map((s) => (
                                  <DropdownMenuItem key={s.value} onClick={() => changeStatus(task.id, s.value)}>
                                    Move to {s.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => handleDeleteTask(task.id)}
                                  data-testid={`btn-delete-task-${task.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center justify-between mt-2.5 gap-1 flex-wrap">
                            <span className={`w-2 h-2 rounded-full ${priorityDot(task.priority)}`} title={task.priority} />
                            <div className="flex items-center gap-1.5 ml-auto">
                              {task.dueDate && (
                                <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue(task) ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {format(new Date(task.dueDate), "MMM d")}
                                </span>
                              )}
                              {task.assignee && (
                                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 inline-flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300" title={task.assignee.name}>
                                  {task.assignee.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => openTaskDialog(col.value)}
                      className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1 px-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                      data-testid={`btn-add-task-${col.value}`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add task
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---- LIST VIEW ---- */}
        <TabsContent value="list">
          <div className="mt-4 space-y-2">
            {tasks?.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border rounded-xl border-dashed">
                No tasks yet. <button onClick={() => openTaskDialog()} className="text-blue-600 hover:underline">Create one</button>
              </div>
            ) : tasks?.map((task) => (
              <div
                key={task.id}
                data-testid={`task-list-row-${task.id}`}
                className={`flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-slate-900 hover:shadow-sm transition-all group ${task.status === "done" ? "opacity-60" : ""} ${isOverdue(task) ? "border-l-4 border-l-red-400" : ""}`}
              >
                <button onClick={() => toggleComplete(task)} className="shrink-0" data-testid={`btn-complete-list-${task.id}`}>
                  {task.status === "done" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500 transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${task.status === "done" ? "line-through text-slate-400" : ""}`}>{task.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    {task.assignee && <span>{task.assignee.name}</span>}
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${isOverdue(task) ? "text-red-500 font-medium" : ""}`}>
                        <Clock className="w-3 h-3" />{format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${priorityDot(task.priority)}`} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUSES.find(s => s.value === task.status)?.color} flex items-center gap-1`} data-testid={`status-btn-${task.id}`}>
                        {task.status.replace("_", " ")} <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {STATUSES.map((s) => (
                        <DropdownMenuItem key={s.value} onClick={() => changeStatus(task.id, s.value)}>{s.label}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" data-testid={`btn-task-menu-list-${task.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ---- MEMBERS VIEW ---- */}
        <TabsContent value="members">
          <div className="mt-4 space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <Button size="sm" onClick={() => setAddMemberOpen(true)} data-testid="btn-add-member">
                <Plus className="w-4 h-4 mr-1" /> Add Member
              </Button>
            </div>
            {members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-sm font-bold">
                      {member.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.user.name}</p>
                    <p className="text-xs text-slate-500">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {member.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => handleRemoveMember(member.id)}
                    data-testid={`btn-remove-member-${member.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Member Dialog */}
          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Add Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  {nonMembers.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
                      No available users to add.<br />
                      <Link href="/settings" className="text-blue-600 hover:underline font-medium">
                        Go to Settings → Create Users
                      </Link>
                    </div>
                  ) : (
                  <Select value={addMemberUserId} onValueChange={setAddMemberUserId}>
                    <SelectTrigger data-testid="select-add-member-user">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {nonMembers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name} — {u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={addMemberRole} onValueChange={(v) => setAddMemberRole(v as "admin" | "member")}>
                    <SelectTrigger data-testid="select-add-member-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleAddMember}
                  disabled={!addMemberUserId || addMember.isPending}
                  data-testid="btn-confirm-add-member"
                >
                  {addMember.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>New Task in {project.name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitTask)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="What needs to be done?" {...field} data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="More details..." rows={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee (optional)</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                        value={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-task-assignee">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {members?.map((m) => (
                            <SelectItem key={m.userId} value={String(m.userId)}>{m.user.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                              data-testid="btn-pick-due-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "MMM d, yyyy") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={(date) => field.onChange(date ?? null)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {field.value && (
                        <Button type="button" variant="ghost" size="sm" className="text-xs h-6 px-2 mt-1" onClick={() => field.onChange(null)}>
                          Clear date
                        </Button>
                      )}
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setTaskDialogOpen(false); form.reset(); }}>Cancel</Button>
                <Button type="submit" disabled={createTask.isPending} data-testid="btn-submit-task">
                  {createTask.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
