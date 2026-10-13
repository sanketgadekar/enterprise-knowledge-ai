"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, MessageSquarePlus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteChatSession, getChatSession, listChatSessions, sendChat } from "@/lib/api-client";
import { permissionMessage } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { extractChatReply, isRecord, normalizeMessages, normalizeSessions } from "@/lib/normalize";
import { cn, newId } from "@/lib/utils";
import type { ChatMessage, SessionSummary } from "@/types/api";
import { Composer, type ComposerHandle } from "./composer";
import { MessageBubble } from "./message-bubble";
import { SessionList } from "./session-list";

const LAST_SESSION_KEY = "eka:last-chat-session"; // a non-secret conversation id

const STARTERS = [
  "Summarize the key points of the documents we've uploaded.",
  "What does our documentation say about ",
];

function hasContent(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0;
  if (isRecord(data)) return Object.keys(data).length > 0;
  return Boolean(data);
}

export function ChatView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const sessionParam = params.get("session");

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [sending, setSending] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<SessionSummary | null>(null);

  /** Session id whose messages are currently owned by local state (avoids reloading what we just wrote). */
  const ownedRef = React.useRef<string | null>(null);
  const composerRef = React.useRef<ComposerHandle>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  // Restore the last open conversation after a route change or refresh.
  React.useEffect(() => {
    if (sessionParam) return;
    try {
      const last = sessionStorage.getItem(LAST_SESSION_KEY);
      if (last) router.replace(`${pathname}?session=${encodeURIComponent(last)}`);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionsQuery = useQuery({ queryKey: ["chat-sessions"], queryFn: ({ signal }) => listChatSessions(signal) });
  const sessions = React.useMemo(() => normalizeSessions(sessionsQuery.data), [sessionsQuery.data]);

  const needsLoad = !!sessionParam && ownedRef.current !== sessionParam;
  const history = useQuery({
    queryKey: ["chat-session", sessionParam],
    queryFn: ({ signal }) => getChatSession(sessionParam!, signal),
    enabled: needsLoad,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });

  React.useEffect(() => {
    if (history.isSuccess && sessionParam && ownedRef.current !== sessionParam) {
      setMessages(normalizeMessages(history.data, newId));
      ownedRef.current = sessionParam;
    }
  }, [history.isSuccess, history.data, sessionParam]);

  React.useEffect(() => {
    if (history.isError && history.error instanceof ApiError && history.error.status === 404) {
      try {
        sessionStorage.removeItem(LAST_SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [history.isError, history.error]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, history.isFetching]);

  const rememberSession = (id: string | null) => {
    try {
      if (id) sessionStorage.setItem(LAST_SESSION_KEY, id);
      else sessionStorage.removeItem(LAST_SESSION_KEY);
    } catch {
      /* ignore */
    }
  };

  const newChat = React.useCallback(() => {
    ownedRef.current = null;
    setMessages([]);
    rememberSession(null);
    router.replace(pathname);
    setHistoryOpen(false);
  }, [router, pathname]);

  const selectSession = (id: string) => {
    setHistoryOpen(false);
    if (id === sessionParam) return;
    ownedRef.current = null;
    setMessages([]);
    rememberSession(id);
    router.push(`${pathname}?session=${encodeURIComponent(id)}`);
  };

  const send = async (text: string) => {
    if (sending) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const pendingMsg: ChatMessage = { id: newId(), role: "assistant", content: "", status: "pending" };
    setMessages((m) => [...m, userMsg, pendingMsg]);
    setSending(true);

    const sid = ownedRef.current ?? sessionParam ?? undefined;
    try {
      const data = await sendChat(text, sid);
      const reply = extractChatReply(data);
      setMessages((m) =>
        m.map((x) => (x.id === pendingMsg.id ? { ...x, status: undefined, content: reply.text, sources: reply.sources } : x)),
      );
      if (!sid && reply.sessionId) {
        ownedRef.current = reply.sessionId;
        rememberSession(reply.sessionId);
        router.replace(`${pathname}?session=${encodeURIComponent(reply.sessionId)}`);
      }
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? "Your session expired. Please sign in again."
          : permissionMessage(err, "use the chat");
      setMessages((m) => m.map((x) => (x.id === pendingMsg.id ? { ...x, status: "error", content: message } : x)));
    } finally {
      setSending(false);
    }
  };

  const retry = (assistantId: string) => {
    if (sending) return;
    const idx = messages.findIndex((m) => m.id === assistantId);
    const prev = messages[idx - 1];
    if (idx < 1 || !prev || prev.role !== "user") return;
    setMessages((m) => m.slice(0, idx - 1));
    void send(prev.content);
  };

  const del = useMutation({
    mutationFn: (id: string) => deleteChatSession(id),
    onSuccess: (_d, id) => {
      toast.success("Conversation deleted");
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
      if (id === sessionParam || id === ownedRef.current) newChat();
      setToDelete(null);
    },
    onError: (err) => {
      toast.error(permissionMessage(err, "delete conversations"));
      setToDelete(null);
    },
  });

  const loadingHistory = needsLoad && history.isFetching;
  const unreadable =
    history.isSuccess && ownedRef.current === sessionParam && messages.length === 0 && hasContent(history.data);
  const sessionsError = sessionsQuery.isError
    ? sessionsQuery.error instanceof ApiError
      ? sessionsQuery.error.message
      : "Couldn't load conversations."
    : undefined;

  const sessionPanel = (
    <SessionList
      sessions={sessions}
      loading={sessionsQuery.isPending}
      error={sessionsError}
      activeId={sessionParam}
      onSelect={selectSession}
      onDelete={setToDelete}
      onRetry={() => sessionsQuery.refetch()}
    />
  );

  return (
    <div className="flex h-full min-h-0 bg-background">
      <aside className="hidden w-72 shrink-0 flex-col border-r bg-card md:flex" aria-label="Conversation history">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">History</h2>
          <Button size="sm" variant="outline" onClick={newChat}>
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden /> New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{sessionPanel}</div>
      </aside>

      {historyOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button className="absolute inset-0 bg-navy/60" aria-label="Close history" onClick={() => setHistoryOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-80 max-w-[88%] flex-col bg-card shadow-xl" aria-label="Conversation history">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">History</h2>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setHistoryOpen(false)} aria-label="Close history">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{sessionPanel}</div>
          </aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Chat">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">AI Chat</h1>
            <p className="truncate text-xs text-muted-foreground">Answers grounded in your company&apos;s documents</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="md:hidden" onClick={() => setHistoryOpen(true)}>
              <History className="h-3.5 w-3.5" aria-hidden /> History
            </Button>
            <Button size="sm" variant="outline" className="md:hidden" onClick={newChat}>
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden /> New
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Conversation">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {loadingHistory && (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading conversation…
              </div>
            )}

            {history.isError && needsLoad && (
              <Alert
                tone="error"
                title="Couldn't load this conversation"
                action={
                  <Button size="sm" variant="outline" onClick={newChat}>
                    Start new chat
                  </Button>
                }
              >
                {history.error instanceof ApiError && history.error.status === 404
                  ? "It may have been deleted."
                  : history.error instanceof ApiError
                    ? history.error.message
                    : "Unexpected error."}
              </Alert>
            )}

            {unreadable && (
              <Alert tone="warning" title="History is in an unrecognised format">
                The server returned this conversation, but its messages couldn&apos;t be displayed. You can still continue the conversation below.
              </Alert>
            )}

            {!loadingHistory && !history.isError && messages.length === 0 && !unreadable && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-7 w-7" aria-hidden />
                </div>
                <h2 className="text-xl font-semibold">Ask your company knowledge</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Questions are answered from the documents your team has uploaded. Start with a question below.
                </p>
                <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => composerRef.current?.setValue(s)}
                      className="rounded-full border bg-card px-3.5 py-2 text-left text-sm text-foreground hover:border-primary/50 hover:bg-green-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onRetry={m.status === "error" ? () => retry(m.id) : undefined} />
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <Composer ref={composerRef} onSend={send} sending={sending} disabled={loadingHistory} />
      </section>

      <Modal
        open={toDelete !== null}
        onClose={() => !del.isPending && setToDelete(null)}
        title="Delete this conversation?"
        description="This permanently removes the conversation from your history. This can't be undone."
      >
        <div className={cn("flex justify-end gap-2 pt-2")}>
          <Button variant="outline" onClick={() => setToDelete(null)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" loading={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
