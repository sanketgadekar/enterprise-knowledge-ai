/**
 * Request/response types.
 *
 * VERIFIED = read from the backend's Swagger UI (screenshots of /docs).
 * Where the Swagger page showed no response schema (or an untyped "string"),
 * the response is typed `unknown` and parsed defensively in `lib/normalize.ts`.
 */

// POST /auth/login — VERIFIED
export interface LoginRequest {
  company_slug: string;
  email: string;
  password: string;
}
export interface LoginResponse {
  company_id: string;
  company_slug: string;
  access_token: string;
  token_type: string; // "bearer"
}

// POST /auth/register — request VERIFIED, response NOT shown
export interface RegisterCompanyRequest {
  company_name: string;
  admin_email: string;
  admin_password: string;
  custom_slug?: string;
}

// GET /users/ — VERIFIED (array of UserOut)
export interface UserOut {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string; // ISO 8601
}

// POST /users/ — request VERIFIED, response NOT shown. Role enum values not shown (example: "admin").
export interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
}

// Identity info the Next.js server returns from /api/session (never contains the token)
export interface SessionInfo {
  company_id: string;
  company_slug: string;
  email: string;
  /** Raw body of GET /auth/me. Swagger shows an untyped "string" schema, so treat as unknown. */
  me: unknown;
}

// POST /chat/ query params — VERIFIED (response shape NOT shown)
export interface ChatRequest {
  query: string;
  sessionId?: string;
}

// ---- UI-level shapes produced by lib/normalize.ts (not backend contracts) ----
export interface SourceRef {
  title: string;
  snippet?: string;
  meta?: string;
}
export interface ChatReply {
  text: string;
  sessionId?: string;
  sources: SourceRef[];
  /** true when no text field could be identified and the raw payload is shown instead */
  unrecognized: boolean;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  status?: "pending" | "error";
  createdAt?: string;
}
export interface SessionSummary {
  id: string;
  title?: string;
  updatedAt?: string;
}
