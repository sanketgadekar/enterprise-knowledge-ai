import { NextRequest, NextResponse } from "next/server";
import { backendBaseUrl } from "@/server/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Forwards company registration. Does NOT log the user in. */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${backendBaseUrl()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const text = await upstream.text();
    return new NextResponse(text || null, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { detail: "Cannot reach the backend. Is it running, and is NEXT_PUBLIC_API_BASE_URL correct?" },
      { status: 502 },
    );
  }
}
