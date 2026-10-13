"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, LayoutDashboard, LogOut, Menu, MessagesSquare, RefreshCw, Users, X, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { logout } from "@/lib/api-client";
import { sessionCompany, sessionEmail, sessionRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessagesSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/users", label: "Users", icon: Users },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const session = useSession();

  const out = useMutation({
    mutationFn: logout,
    onSettled: () => {
      qc.clear();
      toast.success("You have been signed out");
      router.replace("/login");
      router.refresh();
    },
  });

  const email = sessionEmail(session.data);
  const company = sessionCompany(session.data);
  const role = sessionRole(session.data);

  return (
    <div className="flex h-full flex-col bg-navy text-slate-200">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" onClick={onNavigate} aria-label="Enterprise Knowledge AI — dashboard">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-navy-2 text-white" : "text-slate-400 hover:bg-navy-2/60 hover:text-white",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-slate-500 group-hover:text-slate-300")} aria-hidden />
              {label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-navy-line p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-2 text-xs font-semibold text-accent" aria-hidden>
            {email ? initials(email) : "…"}
          </div>
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium text-white" title={email}>
              {email || "Loading account…"}
            </p>
            <p className="truncate text-slate-400" title={company}>
              {company}
              {role ? ` · ${role}` : ""}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start text-slate-300 hover:bg-navy-2/60 hover:text-white"
          onClick={() => out.mutate()}
          loading={out.isPending}
        >
          {!out.isPending && <LogOut className="h-4 w-4" aria-hidden />}
          Sign out
        </Button>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex h-dvh" aria-busy="true" aria-label="Loading workspace">
      <div className="hidden w-64 bg-navy lg:block" />
      <div className="flex-1 space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="grid gap-4 pt-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const [drawer, setDrawer] = React.useState(false);

  React.useEffect(() => setDrawer(false), [pathname]);
  React.useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  if (session.isPending) return <ShellSkeleton />;

  if (session.isError) {
    const unauthorized = session.error instanceof ApiError && session.error.status === 401;
    if (unauthorized) return <ShellSkeleton />; // the global handler is redirecting to /login
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
            <WifiOff className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold">Can&apos;t reach the backend</h1>
          <p className="text-sm text-muted-foreground">
            {session.error instanceof ApiError ? session.error.message : "Something went wrong while loading your workspace."}
          </p>
          <Button onClick={() => session.refetch()} loading={session.isFetching}>
            {!session.isFetching && <RefreshCw className="h-4 w-4" aria-hidden />}
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm">
        Skip to content
      </a>

      <aside className="hidden w-64 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-navy/60" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <aside id="mobile-nav" className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={drawer} aria-controls="mobile-nav" onClick={() => setDrawer(true)}>
            {drawer ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
          <LogoMark className="h-7 w-7" />
          <span className="text-sm font-semibold">Knowledge AI</span>
        </header>
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl p-4 sm:p-8", className)}>{children}</div>;
}
