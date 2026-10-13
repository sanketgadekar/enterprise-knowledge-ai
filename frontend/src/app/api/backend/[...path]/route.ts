import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { backendBaseUrl, META_COOKIE, SESSION_COOKIE } from "@/server/config";
import { resolveProxyRoute } from "@/server/proxy-routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: { path: string[] } };

async function handle(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const route = resolveProxyRoute(req.method, ctx.params.path);
  if (!route) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const url = new URL(backendBaseUrl() + route.backendPath);
  for (const name of route.query) {
    const v = req.nextUrl.searchParams.get(name);
    if (v !== null) url.searchParams.set(name, v);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  let body: ArrayBuffer | undefined;
  if (route.body) {
    const ct = req.headers.get("content-type");
    if (ct) headers["Content-Type"] = ct; // keeps the multipart boundary intact
    body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(route.timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return NextResponse.json(
      {
        detail: timedOut
          ? "The backend took too long to respond."
          : "Cannot reach the backend. Is it running, and is NEXT_PUBLIC_API_BASE_URL correct?",
      },
      { status: timedOut ? 504 : 502 },
    );
  }

  const res = [204, 205, 304].includes(upstream.status)
    ? new NextResponse(null, { status: upstream.status })
    : new NextResponse(await upstream.text(), {
        status: upstream.status,
        headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
      });

  if (upstream.status === 401) {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(META_COOKIE);
  }
  return res;
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
