import { ApiError } from "@/lib/errors";
import { pickString } from "@/lib/normalize";
import type { SessionInfo } from "@/types/api";

export const SESSION_QUERY_KEY = ["session"] as const;

/** Role is shown only if GET /auth/me actually returns one (its schema is not documented). */
export function sessionRole(session: SessionInfo | undefined): string | undefined {
  return pickString(session?.me, ["role", "user_role"]);
}

export function sessionEmail(session: SessionInfo | undefined): string {
  return session?.email || pickString(session?.me, ["email"]) || "";
}

export function sessionCompany(session: SessionInfo | undefined): string {
  return session?.company_slug || pickString(session?.me, ["company_slug", "company_name"]) || "";
}

export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Incorrect company slug, email or password.";
    return err.message;
  }
  return "Sign-in failed. Please try again.";
}

export function permissionMessage(err: unknown, action: string): string {
  if (err instanceof ApiError && err.status === 403) {
    return `You don't have permission to ${action}. Ask a company administrator for access.`;
  }
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}
