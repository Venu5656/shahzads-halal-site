import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";

/**
 * Optimistic auth checks only — this runs on every navigation, so it reads the
 * cookie and never the database. The real gate is the data access layer
 * (src/lib/auth/dal.ts), which every protected page and action calls.
 *
 * 1. /account and /admin without a session cookie go straight to /login.
 * 2. A present session cookie gets its 30-day lifetime renewed, so people who
 *    keep ordering stay signed in (the database expiry slides in step).
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname, search } = request.nextUrl;

  const isProtected = /^\/(account|admin)(\/|$)/.test(pathname);
  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (token) response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, static files and the image/font folders.
    "/((?!_next/static|_next/image|img/|fonts/|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$).*)",
  ],
};
