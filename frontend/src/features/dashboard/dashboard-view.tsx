"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileUp, MessagesSquare, UserPlus, Users, UserCheck, History } from "lucide-react";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { listChatSessions, listUsers } from "@/lib/api-client";
import { sessionCompany, sessionEmail, sessionRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { normalizeSessions } from "@/lib/normalize";

function Stat({
  icon: Icon,
  label,
  value,
  loading,
  note,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  loading: boolean;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-100 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="mt-1 h-7 w-12" /> : <p className="text-2xl font-semibold tabular-nums">{value}</p>}
          {note && !loading && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const shortcuts = [
  { href: "/documents", icon: FileUp, title: "Upload documents", text: "Add company documents so the assistant can ground its answers in them." },
  { href: "/chat", icon: MessagesSquare, title: "Open AI Chat", text: "Ask questions about your uploaded knowledge and revisit past conversations." },
  { href: "/users", icon: UserPlus, title: "Manage users", text: "See who has access to this workspace and add new team members." },
];

export function DashboardView() {
  const session = useSession();
  const users = useQuery({ queryKey: ["users"], queryFn: ({ signal }) => listUsers(signal) });
  const sessions = useQuery({ queryKey: ["chat-sessions"], queryFn: ({ signal }) => listChatSessions(signal) });

  const email = sessionEmail(session.data);
  const company = sessionCompany(session.data);
  const role = sessionRole(session.data);

  const userList = Array.isArray(users.data) ? users.data : [];
  const usersNote = users.isError
    ? users.error instanceof ApiError && users.error.status === 403
      ? "Not available for your role"
      : "Couldn't load"
    : undefined;
  const sessionCount = sessions.data ? normalizeSessions(sessions.data).length : 0;

  return (
    <PageContainer>
      <PageHeader
        title={email ? `Welcome back, ${email.split("@")[0]}` : "Welcome back"}
        description={
          company
            ? `You're signed in to the ${company} workspace${role ? ` as ${role}` : ""}.`
            : "Your company knowledge workspace."
        }
      />

      <section aria-label="Workspace overview" className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="Team members" value={users.isError ? "—" : String(userList.length)} loading={users.isPending} note={usersNote} />
        <Stat
          icon={UserCheck}
          label="Active members"
          value={users.isError ? "—" : String(userList.filter((u) => u.is_active).length)}
          loading={users.isPending}
          note={usersNote}
        />
        <Stat
          icon={History}
          label="Chat conversations"
          value={sessions.isError ? "—" : String(sessionCount)}
          loading={sessions.isPending}
          note={sessions.isError ? "Couldn't load" : undefined}
        />
      </section>

      <section aria-labelledby="shortcuts" className="mt-8">
        <h2 id="shortcuts" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Shortcuts
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {shortcuts.map(({ href, icon: Icon, title, text }) => (
            <Link key={href} href={href} className="group rounded-lg">
              <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-green-50/40">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-navy text-accent">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {title}
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                  </CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="getting-started" className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle id="getting-started">Getting started</CardTitle>
            <CardDescription>The usual path from an empty workspace to useful answers.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                ["Upload your documents", "Go to Documents and add PDF, TXT, DOCX or CSV files. Processing happens on the server after upload."],
                ["Ask a question in AI Chat", "Once documents are processed, ask about their content. Answers come from your company's knowledge base."],
                ["Invite your team", "Add colleagues from Users so they can sign in with your company slug."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-primary">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{t}</p>
                    <p className="text-sm text-muted-foreground">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
