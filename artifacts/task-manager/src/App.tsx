import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";

import { HomePage } from "@/pages/home";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { DashboardPage } from "@/pages/dashboard";
import { ProjectsPage } from "@/pages/projects";
import { ProjectDetailPage } from "@/pages/project-detail";
import { TasksPage } from "@/pages/tasks";
import { SettingsPage } from "@/pages/settings";
import { AppLayout } from "@/components/layout";

// On Replit the key is derived from the host (whitelabel auth).
// On local / Railway we use the env var directly.
const isReplitHost =
  window.location.hostname.endsWith(".replit.dev") ||
  window.location.hostname.endsWith(".repl.co") ||
  window.location.hostname.endsWith(".pike.replit.dev");

const clerkPubKey = isReplitHost
  ? publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    )
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Only use proxy on Replit
const clerkProxyUrl = isReplitHost
  ? import.meta.env.VITE_CLERK_PROXY_URL
  : undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) qc.clear();
      prevRef.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <HomePage />
      </Show>
    </>
  );
}

function AuthenticatedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  
  if (!clerkPubKey) {
    return <div>Missing Clerk Publishable Key</div>;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={{ 
        theme: shadcn, 
        cssLayerName: "clerk", 
        options: { 
          logoPlacement: "inside", 
          logoLinkUrl: basePath || "/", 
          logoImageUrl: `${window.location.origin}${basePath}/logo.svg` 
        }, 
        variables: { 
          colorPrimary: "hsl(221 83% 53%)",
          colorBackground: "hsl(0 0% 100%)",
          colorForeground: "hsl(240 10% 3.9%)",
          colorNeutral: "hsl(240 5.9% 90%)",
          colorDanger: "hsl(0 84.2% 60.2%)",
          borderRadius: "0.5rem",
        }, 
        elements: { 
          cardBox: "w-[440px] max-w-full bg-white dark:bg-slate-950",
          headerTitle: "text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50",
          headerSubtitle: "text-slate-500 dark:text-slate-400",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all",
          formFieldLabel: "text-slate-950 dark:text-slate-50 font-medium",
          formFieldInput: "bg-transparent border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50",
          socialButtonsBlockButton: "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors",
          socialButtonsBlockButtonText: "text-slate-700 dark:text-slate-300 font-medium",
          footerActionText: "text-slate-500 dark:text-slate-400",
          footerActionLink: "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
          dividerText: "text-slate-500 dark:text-slate-400",
          dividerLine: "bg-slate-200 dark:bg-slate-800",
          identityPreviewEditButton: "text-blue-600",
          formFieldSuccessText: "text-green-600",
          alertText: "text-red-600",
          logoBox: "mb-6",
          logoImage: "h-10 w-auto",
          footerAction: "mt-6 border-t border-slate-200 dark:border-slate-800 pt-6",
          alert: "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900",
          otpCodeFieldInput: "border-slate-200 dark:border-slate-800",
          formFieldRow: "mb-4",
          main: "gap-6",
        } 
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{ 
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your workspace" } }, 
        signUp: { start: { title: "Create account", subtitle: "Start managing your team" } } 
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard">
              <AuthenticatedRoute component={DashboardPage} />
            </Route>
            <Route path="/projects">
              <AuthenticatedRoute component={ProjectsPage} />
            </Route>
            <Route path="/projects/:id">
              <AuthenticatedRoute component={ProjectDetailPage} />
            </Route>
            <Route path="/tasks">
              <AuthenticatedRoute component={TasksPage} />
            </Route>
            <Route path="/settings">
              <AuthenticatedRoute component={SettingsPage} />
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}