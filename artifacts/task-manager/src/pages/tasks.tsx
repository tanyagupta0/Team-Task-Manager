import { useState } from "react";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjects,
  useListUsers,
  getListTasksQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMyTasksQueryKey,
  getGetOverdueTasksQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Plus, CheckCircle2, Circle, Clock, MoreHorizontal, CalendarIcon,
  Trash2, ChevronDown, AlertCircle, Loader2, CheckSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
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
  projectId: z.coerce.number().min(1, "Project is required"),
  assigneeId: z.coerce.number().optional().nullable(),
  dueDate: z.date().optional().nullable(),
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

function statusColor(status: string) {
  switch (status) {
    case "done": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "in_review": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case "urgent": return "text-red-600 dark:text-red-400";
    case "high": return "text-orange-500 dark:text-orange-400";
    case "medium": return "text-blue-500 dark:text-blue-400";
    default: return "text-slate-400";
  }
}

function priorityDot(priority: string) {
  switch (priority) {
    case "urgent": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-blue-500";
    default: return "bg-slate-400";
  }
}

function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetOverdueTasksQueryKey() });
}

export function TasksPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const { data: projects } = useListProjects();
  const { data: users } = useListUsers();

  const queryParams: Record<string, string | number> = {};
  if (filterStatus !== "all") queryParams.status = filterStatus;
  if (filterPriority !== "all") queryParams.priority = filterPriority;
  if (filterProject !== "all") queryParams.projectId = Number(filterProject);

  const { data: tasks, isLoading } = useListTasks(queryParams as any);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      projectId: undefined as any,
      assigneeId: null,
      dueDate: null,
    },
  });

  function onSubmit(data: CreateTaskValues) {
    createTask.mutate(
      {
        data: {
          title: data.title,
          description: data.description || null,
          status: data.status,
          priority: data.priority,
          projectId: data.projectId,
          assigneeId: data.assigneeId || null,
          dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          invalidateAll();
          toast({ title: "Task created", description: `"${data.title}" has been added.` });
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
          invalidateAll();
          toast({
            title: newStatus === "done" ? "Task completed!" : "Task reopened",
            description: `"${task.title}" marked as ${newStatus === "done" ? "done" : "to do"}.`,
          });
        },
      }
    );
  }

  function changeStatus(taskId: number, status: string) {
    updateTask.mutate(
      { id: taskId, data: { status: status as any } },
      { onSuccess: () => { invalidateAll(); } }
    );
  }

  function handleDelete(taskId: number) {
    deleteTask.mutate(
      { id: taskId },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Task deleted" });
        },
      }
    );
  }

  const isOverdue = (task: { dueDate?: string | null; status: string }) =>
    task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {tasks?.length ?? 0} task{tasks?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="btn-new-task">
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36" data-testid="filter-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44" data-testid="filter-project">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterStatus !== "all" || filterPriority !== "all" || filterProject !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterProject("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-20 border rounded-xl border-dashed bg-white dark:bg-slate-900">
          <CheckSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <h3 className="mt-4 text-lg font-medium">No tasks found</h3>
          <p className="mt-1 text-slate-500 text-sm">
            {filterStatus !== "all" || filterPriority !== "all" || filterProject !== "all"
              ? "Try adjusting your filters."
              : "Create your first task to get started."}
          </p>
          <Button className="mt-6" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks?.map((task) => (
            <div
              key={task.id}
              data-testid={`task-row-${task.id}`}
              className={`flex items-start gap-4 p-4 rounded-xl border bg-white dark:bg-slate-900 hover:shadow-sm transition-all group ${
                task.status === "done" ? "opacity-60" : ""
              } ${isOverdue(task) ? "border-l-4 border-l-red-400" : ""}`}
            >
              {/* Complete toggle */}
              <button
                data-testid={`btn-complete-${task.id}`}
                onClick={() => toggleComplete(task)}
                className="mt-0.5 shrink-0 transition-colors"
                disabled={updateTask.isPending && editingTaskId === task.id}
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500 transition-colors" />
                )}
              </button>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className={`font-medium text-slate-900 dark:text-white truncate ${task.status === "done" ? "line-through text-slate-400" : ""}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Priority dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(task.priority)}`} title={task.priority} />

                    {/* Status badge + dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          data-testid={`status-btn-${task.id}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(task.status)} hover:opacity-80 transition-opacity`}
                        >
                          {task.status.replace("_", " ")}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s.value}
                            onClick={() => changeStatus(task.id, s.value)}
                            className={task.status === s.value ? "font-semibold" : ""}
                            data-testid={`status-option-${s.value}`}
                          >
                            {s.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* More menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`btn-task-menu-${task.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleComplete(task)}>
                          {task.status === "done" ? "Reopen task" : "Mark as done"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400"
                          onClick={() => handleDelete(task.id)}
                          data-testid={`btn-delete-task-${task.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {task.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: task.project.color + "20", color: task.project.color }}
                  >
                    {task.project.name}
                  </span>
                  {task.assignee && (
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 inline-flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </span>
                      {task.assignee.name}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 ${isOverdue(task) ? "text-red-500 font-medium" : ""}`}>
                      <Clock className="w-3 h-3" />
                      {isOverdue(task) ? "Overdue · " : ""}
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Textarea placeholder="Add more details..." rows={3} {...field} data-testid="input-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <FormMessage />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 mt-1"
                        onClick={() => field.onChange(null)}
                      >
                        Clear date
                      </Button>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); form.reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTask.isPending} data-testid="btn-submit-task">
                  {createTask.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
