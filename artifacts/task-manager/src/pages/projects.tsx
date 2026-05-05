import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderGit2, Plus, Users, CheckSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { queryClient } from "@/lib/queryClient";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
});

type CreateProjectValues = z.infer<typeof createProjectSchema>;

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];

export function ProjectsPage() {
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: COLORS[0],
    },
  });

  function onSubmit(data: CreateProjectValues) {
    createProject.mutate({ data }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your team's workspaces</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-new-project"><Plus className="w-4 h-4 mr-2" /> New Project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Set up a new workspace for your team's tasks.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Website Redesign" {...field} data-testid="input-project-name" />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What is this project about?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          {COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => field.onChange(c)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${field.value === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-110'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createProject.isPending} data-testid="btn-submit-project">
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border rounded-xl border-dashed">
          <FolderGit2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">No projects yet</h3>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Get started by creating a new project.</p>
          <Button className="mt-6" onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create Project</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer overflow-hidden group">
                <div className="h-2 w-full" style={{ backgroundColor: project.color }} />
                <CardHeader>
                  <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
                    {project.description || "No description"}
                  </p>
                </CardContent>
                <CardFooter className="bg-slate-50 dark:bg-slate-900/50 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{project.memberCount}</span>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
