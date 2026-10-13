import { ApiError, defaultMessage, parseErrorBody } from "@/lib/errors";
import type {
  CreateUserRequest,
  LoginRequest,
  RegisterCompanyRequest,
  SessionInfo,
  UserOut,
} from "@/types/api";

/**
 * Centralised browser-side API client.
 *
 * The browser only talks to this Next.js app (same origin): `/api/auth/*`,
 * `/api/session` and `/api/backend/*`. The Next.js server attaches the bearer
 * token from an HttpOnly cookie and forwards to FastAPI
 * (`NEXT_PUBLIC_API_BASE_URL`). Tokens are never readable or logged here.
 */

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  json?: unknown;
  body?: FormData;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Public endpoints (login/register) must not trigger the "session expired" redirect. */
  skipAuthRedirect?: boolean;
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", json, body, query, signal, timeoutMs = 30_000, skipAuthRedirect = false } = opts;

  let url = path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, v);
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;
  if (body) {
    payload = body; // FormData: the browser sets the multipart Content-Type + boundary itself
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(json);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: payload,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err; // caller cancelled: propagate AbortError untouched
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new ApiError("The request timed out. Please try again.", 504);
    }
    throw new ApiError(defaultMessage(0), 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  const data = await readBody(res);
  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect) onUnauthorized?.();
    const { message, fieldErrors } = parseErrorBody(res.status, data);
    throw new ApiError(message, res.status, fieldErrors);
  }
  return data as T;
}

// ---------------------------------------------------------------- auth
export interface LoginResult {
  company_id: string;
  company_slug: string;
  email: string;
}

export const login = (req: LoginRequest) =>
  apiRequest<LoginResult>("/api/auth/login", { method: "POST", json: req, skipAuthRedirect: true });

export const registerCompany = (req: RegisterCompanyRequest) =>
  apiRequest<unknown>("/api/auth/register", { method: "POST", json: req, skipAuthRedirect: true });

export const logout = () =>
  apiRequest<unknown>("/api/auth/logout", { method: "POST", skipAuthRedirect: true });

export const getSession = (signal?: AbortSignal) =>
  apiRequest<SessionInfo>("/api/session", { signal });

// ---------------------------------------------------------------- users
export const listUsers = (signal?: AbortSignal) => apiRequest<UserOut[]>("/api/backend/users", { signal });

export const createUser = (req: CreateUserRequest) =>
  apiRequest<unknown>("/api/backend/users", { method: "POST", json: req });

// ---------------------------------------------------------------- chat
export const sendChat = (query: string, sessionId?: string, signal?: AbortSignal) =>
  apiRequest<unknown>("/api/backend/chat", {
    method: "POST",
    query: { query, session_id: sessionId },
    signal,
    timeoutMs: 3 * 60_000,
  });

export const listChatSessions = (signal?: AbortSignal) =>
  apiRequest<unknown>("/api/backend/chat/sessions", { signal });

export const getChatSession = (sessionId: string, signal?: AbortSignal) =>
  apiRequest<unknown>(`/api/backend/chat/sessions/${encodeURIComponent(sessionId)}`, { signal });

export const deleteChatSession = (sessionId: string) =>
  apiRequest<unknown>(`/api/backend/chat/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });

// ---------------------------------------------------------------- documents
/**
 * Multipart upload with progress. Uses XMLHttpRequest because fetch() cannot report
 * upload progress. The FormData field is named `file` (verified); no Content-Type
 * header is set so the browser adds the multipart boundary.
 */
export function uploadDocument(
  file: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/backend/ingest/upload");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.responseType = "text";
    xhr.timeout = 10 * 60_000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: unknown = undefined;
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = xhr.responseText;
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve({ status: xhr.status, data });
      } else {
        if (xhr.status === 401) onUnauthorized?.();
        const { message, fieldErrors } = parseErrorBody(xhr.status, data);
        reject(new ApiError(message, xhr.status, fieldErrors));
      }
    };
    xhr.onerror = () => reject(new ApiError(defaultMessage(0), 0));
    xhr.ontimeout = () => reject(new ApiError("The upload timed out.", 504));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(form);
  });
}
