import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/config";

/**
 * Cheap first gate: no session cookie -> /login. This is a convenience, NOT a
 * security boundary; the backend validates the bearer token on every request.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/users/:path*", "/documents/:path*", "/chat/:path*"],
};
