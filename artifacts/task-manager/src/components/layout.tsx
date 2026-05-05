import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { LayoutDashboard, CheckSquare, FolderGit2, Settings, LogOut, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: user, isLoading } = useGetMe();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: FolderGit2 },
    { label: "Tasks", href: "/tasks", icon: CheckSquare },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col hidden md:flex sticky top-0 h-[100dvh]">
        <div className="h-16 flex items-center px-6 border-b dark:border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TaskFlow</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2">Menu</div>
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t dark:border-slate-800">
          <Link 
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors mb-2 ${
              location.startsWith("/settings")
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            }`}
            data-testid="nav-settings"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          
          <div className="flex items-center gap-3 px-3 py-2 mt-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {isLoading ? "Loading..." : user?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.role === "admin" ? "Administrator" : "Member"}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0"
              onClick={() => signOut()}
              data-testid="btn-sign-out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white dark:bg-slate-900 dark:border-slate-800 md:hidden sticky top-0 z-10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TaskFlow</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
