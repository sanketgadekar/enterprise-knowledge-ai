/** Server-only helpers. Never import this file from a client component. */

export const SESSION_COOKIE = "eka_session"; // HttpOnly: holds the backend bearer token
export const META_COOKIE = "eka_meta"; // HttpOnly: non-secret identity info for the UI
export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export function backendBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export interface SessionMeta {
  company_id: string;
  company_slug: string;
  email: string;
}

export function parseMeta(raw: string | undefined): SessionMeta | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (v && typeof v === "object") {
      const r = v as Record<string, unknown>;
      if (typeof r.company_slug === "string" && typeof r.email === "string") {
        return {
          company_id: typeof r.company_id === "string" ? r.company_id : "",
          company_slug: r.company_slug,
          email: r.email,
        };
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Best-effort expiry from a JWT `exp` claim (not verified; used only for cookie lifetime). */
export function tokenMaxAgeSeconds(token: string, fallback = 60 * 60 * 8): number {
  try {
    const part = token.split(".")[1];
    if (!part) return fallback;
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    if (typeof exp === "number") {
      const secs = Math.floor(exp - Date.now() / 1000);
      if (secs > 0) return secs;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]?.trim() === "https";
  return new URL(req.url).protocol === "https:";
}

export function cookieOptions(req: Request, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureRequest(req),
    path: "/",
    maxAge,
  };
}
