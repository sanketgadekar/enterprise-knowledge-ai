"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search, ShieldAlert, UserPlus, Users } from "lucide-react";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listUsers } from "@/lib/api-client";
import { permissionMessage } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import { CreateUserDialog } from "./create-user-dialog";

export function UsersView() {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const query = useQuery({ queryKey: ["users"], queryFn: ({ signal }) => listUsers(signal) });

  const users = React.useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);
  const roles = React.useMemo(() => Array.from(new Set(["admin", ...users.map((u) => u.role)])).sort(), [users]);
  const shown = users.filter((u) => `${u.email} ${u.role}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const forbidden = query.error instanceof ApiError && query.error.status === 403;

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="People with access to this company workspace."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]}
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden /> Add user
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              aria-label="Filter users by email or role"
              placeholder="Filter by email or role"
              className="pl-9"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {query.isSuccess && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {shown.length} of {users.length} user{users.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {query.isPending && (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading users">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}

        {query.isError && (
          <div className="p-4">
            {forbidden ? (
              <EmptyState
                icon={ShieldAlert}
                title="You don't have access to the user list"
                description={permissionMessage(query.error, "view users")}
              />
            ) : (
              <Alert
                tone="error"
                title="Couldn't load users"
                action={
                  <Button size="sm" variant="outline" onClick={() => query.refetch()} loading={query.isFetching}>
                    {!query.isFetching && <RefreshCw className="h-3.5 w-3.5" aria-hidden />} Retry
                  </Button>
                }
              >
                {query.error instanceof ApiError ? query.error.message : "Unexpected error."}
              </Alert>
            )}
          </div>
        )}

        {query.isSuccess && users.length === 0 && (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Add the first team member to give them access to this workspace."
            action={
              <Button onClick={() => setOpen(true)}>
                <UserPlus className="h-4 w-4" aria-hidden /> Add user
              </Button>
            }
          />
        )}

        {query.isSuccess && users.length > 0 && shown.length === 0 && (
          <EmptyState icon={Search} title="No matching users" description="Try a different email or role." />
        )}

        {query.isSuccess && shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Users in this workspace</caption>
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Email</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === "admin" ? "info" : "neutral"}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        The backend currently exposes only listing and creating users — editing, deactivating or deleting users isn&apos;t available.
      </p>

      <CreateUserDialog open={open} onClose={() => setOpen(false)} roleSuggestions={roles} />
    </PageContainer>
  );
}
