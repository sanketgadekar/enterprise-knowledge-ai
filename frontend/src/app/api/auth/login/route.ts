import { NextRequest, NextResponse } from "next/server";
import {
  backendBaseUrl,
  cookieOptions,
  META_COOKIE,
  SESSION_COOKIE,
  tokenMaxAgeSeconds,
} from "@/server/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }
  const p = (payload ?? {}) as Record<string, unknown>;
  const body = {
    company_slug: String(p.company_slug ?? ""),
    email: String(p.email ?? ""),
    password: String(p.password ?? ""),
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${backendBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json(
      { detail: "Cannot reach the backend. Is it running, and is NEXT_PUBLIC_API_BASE_URL correct?" },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!upstream.ok) {
    return NextResponse.json(data ?? { detail: text || "Login failed." }, { status: upstream.status });
  }

  const r = (data ?? {}) as Record<string, unknown>;
  const token = typeof r.access_token === "string" ? r.access_token : "";
  if (!token) {
    return NextResponse.json({ detail: "The server did not return an access token." }, { status: 502 });
  }

  const meta = {
    company_id: typeof r.company_id === "string" ? r.company_id : "",
    company_slug: typeof r.company_slug === "string" ? r.company_slug : body.company_slug,
    email: body.email,
  };
  const maxAge = tokenMaxAgeSeconds(token);
  const res = NextResponse.json(meta);
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(req, maxAge));
  res.cookies.set(META_COOKIE, JSON.stringify(meta), cookieOptions(req, maxAge));
  return res; // the token itself is never returned to the browser
}
