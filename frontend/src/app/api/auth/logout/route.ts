import { NextResponse } from "next/server";
import { META_COOKIE, SESSION_COOKIE } from "@/server/config";

export const dynamic = "force-dynamic";

/** The backend exposes no logout endpoint, so logout = delete our session cookies. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(META_COOKIE);
  return res;
}
