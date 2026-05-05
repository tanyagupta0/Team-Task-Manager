import { Link } from "wouter";
import { CheckCircle2, Layout, Users, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";

export function HomePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="px-6 py-4 flex items-center justify-between border-b bg-white dark:bg-slate-950 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 rounded-lg p-1.5">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Task manager T.M.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors" data-testid="link-sign-in">
            Log in
          </Link>
          <Link href="/sign-up" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors" data-testid="link-sign-up">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="py-24 px-6 max-w-5xl mx-auto w-full text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>The new standard for team productivity</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mb-6">
            Ship faster with perfect clarity.
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10">
            TaskFlow is the focused, no-nonsense workspace for teams who need to get things done. Dense with information, but never cluttered.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/sign-up" className="h-12 px-8 inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-lg" data-testid="btn-hero-cta">
              Start Building Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <section className="py-20 px-6 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Layout className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Uncluttered Views</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  See exactly what needs your attention without digging through menus. Every pixel serves a purpose.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Built for Teams</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Assign tasks, manage roles, and collaborate seamlessly. Stay perfectly synced with activity feeds.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Instant Insights</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Your dashboard brings overdue tasks and project health right to the surface.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 border-t bg-white dark:bg-slate-950 dark:border-slate-800 text-center">
        <p className="text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} TaskFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}
