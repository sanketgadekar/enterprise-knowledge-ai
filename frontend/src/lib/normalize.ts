import type { ChatMessage, ChatReply, SessionSummary, SourceRef } from "@/types/api";

/**
 * Defensive parsers for responses whose schema the Swagger page did NOT show
 * (POST /chat/, GET /chat/sessions, GET /chat/sessions/{id}). They accept the
 * most plausible shapes, never throw, and degrade to a visible "unrecognised
 * format" state rather than inventing data. See API_REFERENCE.md.
 */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function pickString(obj: unknown, keys: readonly string[]): string | undefined {
  if (!isRecord(obj)) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

const TEXT_KEYS = ["answer", "response", "reply", "message", "content", "text", "output", "result"] as const;
const SOURCE_LIST_KEYS = ["sources", "citations", "references", "documents", "context"] as const;
const SOURCE_TITLE_KEYS = ["title", "source", "filename", "file_name", "document_name", "document", "name"] as const;
const SOURCE_SNIPPET_KEYS = ["snippet", "text", "content", "excerpt", "chunk"] as const;

export function normalizeSources(value: unknown): SourceRef[] {
  if (!Array.isArray(value)) return [];
  const out: SourceRef[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push({ title: item.trim() });
    } else if (isRecord(item)) {
      const title = pickString(item, SOURCE_TITLE_KEYS) ?? "Source";
      const snippet = pickString(item, SOURCE_SNIPPET_KEYS);
      const page = typeof item.page === "number" ? `Page ${item.page}` : undefined;
      out.push({ title, snippet: snippet && snippet !== title ? snippet : undefined, meta: page });
    }
  }
  return out;
}

export function extractChatReply(data: unknown): ChatReply {
  if (typeof data === "string") {
    return { text: data, sources: [], unrecognized: false };
  }
  if (isRecord(data)) {
    const sessionId = pickString(data, ["session_id", "sessionId"]);
    let sources: SourceRef[] = [];
    for (const k of SOURCE_LIST_KEYS) {
      const s = normalizeSources(data[k]);
      if (s.length) {
        sources = s;
        break;
      }
    }
    const text = pickString(data, TEXT_KEYS);
    if (text !== undefined) return { text, sessionId, sources, unrecognized: false };
    return {
      text: "```json\n" + JSON.stringify(data, null, 2) + "\n```",
      sessionId,
      sources,
      unrecognized: true,
    };
  }
  return { text: "", sources: [], unrecognized: false };
}

export function normalizeSessions(data: unknown): SessionSummary[] {
  const list = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.sessions)
      ? data.sessions
      : [];
  const out: SessionSummary[] = [];
  for (const item of list) {
    if (typeof item === "string" && item) {
      out.push({ id: item });
    } else if (typeof item === "number") {
      out.push({ id: String(item) });
    } else if (isRecord(item)) {
      const id = pickString(item, ["session_id", "id", "sessionId"]);
      if (!id) continue;
      out.push({
        id,
        title: pickString(item, ["title", "name", "summary", "first_query", "first_message", "preview"]),
        updatedAt: pickString(item, ["updated_at", "last_message_at", "last_activity", "created_at", "createdAt"]),
      });
    }
  }
  return out;
}

export function normalizeMessages(data: unknown, makeId: () => string): ChatMessage[] {
  const list = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.messages)
      ? data.messages
      : isRecord(data) && Array.isArray(data.history)
        ? data.history
        : [];
  const out: ChatMessage[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const createdAt = pickString(item, ["created_at", "timestamp", "createdAt"]);

    // Shape A: one record per turn with a role
    const roleRaw = pickString(item, ["role", "sender", "type"])?.toLowerCase();
    const content = pickString(item, ["content", "message", "text"]);
    if (roleRaw && content !== undefined) {
      const role = roleRaw === "user" || roleRaw === "human" ? "user" : "assistant";
      out.push({ id: makeId(), role, content, createdAt, sources: normalizeSources(item.sources ?? item.citations) });
      continue;
    }

    // Shape B: one record holding both sides of an exchange
    const q = pickString(item, ["query", "question", "prompt", "user_message"]);
    const a = pickString(item, ["answer", "response", "reply", "assistant_message"]);
    if (q) out.push({ id: makeId(), role: "user", content: q, createdAt });
    if (a) out.push({ id: makeId(), role: "assistant", content: a, createdAt, sources: normalizeSources(item.sources ?? item.citations) });
  }
  return out;
}
