/**
 * Allow-list that maps browser-facing proxy paths (`/api/backend/...`) to the
 * verified backend paths. Anything not listed is rejected, so the proxy is
 * not an open relay.
 *
 * Browser paths intentionally have no trailing slash (Next.js would redirect
 * them); the backend paths keep the exact slash style shown in its OpenAPI docs.
 */
export interface ResolvedRoute {
  backendPath: string;
  /** Query parameters that may be forwarded to the backend. */
  query: readonly string[];
  /** Whether the request body is forwarded. */
  body: boolean;
  timeoutMs: number;
}

export function resolveProxyRoute(method: string, segments: string[]): ResolvedRoute | null {
  const key = segments.join("/");
  const m = method.toUpperCase();

  if (key === "users" && m === "GET")
    return { backendPath: "/users/", query: [], body: false, timeoutMs: 30_000 };
  if (key === "users" && m === "POST")
    return { backendPath: "/users/", query: [], body: true, timeoutMs: 30_000 };
  if (key === "ingest/upload" && m === "POST")
    return { backendPath: "/ingest/upload", query: [], body: true, timeoutMs: 10 * 60_000 };
  if (key === "chat" && m === "POST")
    return { backendPath: "/chat/", query: ["query", "session_id"], body: false, timeoutMs: 3 * 60_000 };
  if (key === "chat/sessions" && m === "GET")
    return { backendPath: "/chat/sessions", query: [], body: false, timeoutMs: 30_000 };

  if (segments.length === 3 && segments[0] === "chat" && segments[1] === "sessions" && segments[2]) {
    const id = encodeURIComponent(segments[2]);
    if (m === "GET" || m === "DELETE")
      return { backendPath: `/chat/sessions/${id}`, query: [], body: false, timeoutMs: 30_000 };
  }
  return null;
}
