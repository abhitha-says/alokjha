import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy — session-cookie presence check for /admin/*.
 *
 * This is NOT the authorisation boundary. It is a cheap redirect that keeps
 * anonymous browsers off the admin routes without a DB round-trip. The real
 * check — session validation, role check, TOTP confirmation, audit log write —
 * happens inside `requireAdmin()` / `requireEditor()` in lib/admin-auth.ts,
 * which is called at the top of every admin page and Server Action.
 *
 * Why this matters: Next.js docs (and this plan, §3.1) are explicit that
 * Server Actions are POST requests to the route they live on. A matcher
 * refactor can silently drop coverage. Auth must be re-verified inside every
 * Server Action, never in the proxy alone.
 */
export function proxy(request: NextRequest) {
  // DEV BYPASS — skip auth entirely in local development.
  // NODE_ENV is never 'development' in production builds.
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // The session cookie name matches what lib/auth.ts sets: "hs.session-token"
  const sessionCookie = request.cookies.get("hs.session-token");

  if (!sessionCookie?.value) {
    const signIn = new URL("/signin", request.url);
    signIn.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  // Cookie is present — let the request through. The page/action will call
  // requireAdmin() or requireEditor() which validates it against the DB.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Webhooks are excluded: Razorpay does not send session cookies and the
    // route authenticates via HMAC signature, not via a user session.
    // Listing /api/webhooks here as a negative lookahead prevents a proxy
    // refactor from accidentally catching it.
  ],
};
