"use client";

import { MessageSquare, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { SessionSummary } from "@/types/api";

export function SessionList({
  sessions,
  loading,
  error,
  activeId,
  onSelect,
  onDelete,
  onRetry,
}: {
  sessions: SessionSummary[];
  loading: boolean;
  error?: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (s: SessionSummary) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading conversations">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3 p-4 text-sm">
        <p className="text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
        </Button>
      </div>
    );
  }
  if (sessions.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No earlier conversations yet. Ask your first question to start one.</p>;
  }
  return (
    <ul className="space-y-1 p-2" aria-label="Conversations">
      {sessions.map((s) => {
        const active = s.id === activeId;
        return (
          <li key={s.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 pr-10 text-left text-sm transition-colors",
                active ? "bg-green-50 text-foreground ring-1 ring-primary/30" : "hover:bg-muted",
              )}
            >
              <MessageSquare className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.title ?? `Conversation ${s.id.slice(0, 8)}`}</span>
                {s.updatedAt && <span className="block truncate text-xs text-muted-foreground">{formatDate(s.updatedAt)}</span>}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(s)}
              aria-label={`Delete conversation ${s.title ?? s.id.slice(0, 8)}`}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-red-50 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
