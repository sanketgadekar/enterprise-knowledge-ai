import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendBaseUrl, META_COOKIE, parseMeta, SESSION_COOKIE } from "@/server/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Validates the session against GET /auth/me and returns identity info (never the token). */
export async function GET() {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const meta = parseMeta(jar.get(META_COOKIE)?.value);

  let upstream: Response;
  try {
    upstream = await fetch(`${backendBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { detail: "Cannot reach the backend. Is it running, and is NEXT_PUBLIC_API_BASE_URL correct?" },
      { status: 502 },
    );
  }

  if (upstream.status === 401 || upstream.status === 403) {
    const res = NextResponse.json({ detail: "Session expired" }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(META_COOKIE);
    return res;
  }
  if (!upstream.ok) {
    return NextResponse.json({ detail: "Could not verify the session." }, { status: 502 });
  }

  let me: unknown = null;
  try {
    me = await upstream.json();
  } catch {
    me = null;
  }
  return NextResponse.json({ ...(meta ?? { company_id: "", company_slug: "", email: "" }), me });
}
