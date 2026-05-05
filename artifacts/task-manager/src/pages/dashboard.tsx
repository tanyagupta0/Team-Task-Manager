import { useGetDashboardSummary, useGetMyTasks, useGetOverdueTasks, useGetRecentActivity, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckSquare, FolderGit2, AlertCircle, Clock, ArrowRight, Activity, Plus } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: myTasks, isLoading: isLoadingMyTasks } = useGetMyTasks();
  const { data: overdueTasks, isLoading: isLoadingOverdueTasks } = useGetOverdueTasks();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of your team's progress</p>
        </div>
        <Link href="/tasks">
          <Button data-testid="btn-new-task"><Plus className="w-4 h-4 mr-2" /> New Task</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Projects</CardTitle>
            <FolderGit2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalProjects || 0}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">{summary?.activeProjects || 0} active</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Tasks Completed</CardTitle>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.completedTasks || 0}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">out of {summary?.totalTasks || 0} total</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">My Tasks</CardTitle>
            <Clock className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.myTasks || 0}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">assigned to you</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Overdue Tasks</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary?.overdueTasks || 0}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">needs attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between shrink-0">
            <div>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you that need attention</CardDescription>
            </div>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {isLoadingMyTasks ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : myTasks?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <CheckSquare className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-sm text-slate-500 mt-1">You have no tasks assigned to you right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks?.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-500' : 
                        task.priority === 'high' ? 'bg-orange-500' : 
                        task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <div>
                        <Link href={`/projects/${task.projectId}`} className="font-medium hover:text-blue-600 transition-colors">
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{task.project.name}</span>
                          <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-xs text-slate-500 capitalize">{task.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col h-[400px]">
          <CardHeader className="shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activity?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 text-slate-500">
                No recent activity
              </div>
            ) : (
              <div className="space-y-6">
                {activity?.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative mt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="absolute top-2 left-1 w-[1px] h-full bg-slate-200 dark:bg-slate-800 -ml-[0.5px]" />
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium text-slate-900 dark:text-white">{item.userName}</span>
                        {' '}
                        <span className="text-slate-600 dark:text-slate-400">{item.description}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
