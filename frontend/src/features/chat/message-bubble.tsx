"use client";

import { AlertCircle, BookOpen, RotateCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/api";

export function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry?: () => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-navy px-4 py-2.5 text-sm text-white sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-full flex-1">
        <p className="sr-only">Assistant</p>
        {message.status === "pending" ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground" role="status">
            <span className="flex gap-1" aria-hidden>
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
            Searching your knowledge base…
          </div>
        ) : message.status === "error" ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="break-words">{message.content}</p>
              {onRetry && (
                <Button size="sm" variant="outline" className="mt-2 bg-white" onClick={onRetry}>
                  <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
                </Button>
              )}
            </div>
          </div>
        ) : message.content.trim() === "" ? (
          <p className="py-2 text-sm italic text-muted-foreground">The assistant returned an empty response.</p>
        ) : (
          <Markdown>{message.content}</Markdown>
        )}

        {message.sources && message.sources.length > 0 && message.status !== "pending" && message.status !== "error" && (
          <section aria-label="Sources" className="mt-4 rounded-lg border bg-muted/40 p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> Sources ({message.sources.length})
            </h3>
            <ul className="space-y-2">
              {message.sources.map((s, i) => (
                <li key={`${s.title}-${i}`} className={cn("rounded-md border bg-card p-2.5 text-sm")}>
                  <p className="font-medium">
                    {s.title}
                    {s.meta && <span className="ml-2 text-xs font-normal text-muted-foreground">{s.meta}</span>}
                  </p>
                  {s.snippet && <p className="mt-1 line-clamp-3 break-words text-xs text-muted-foreground">{s.snippet}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
