import { NextRequest, NextResponse, after } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { subscribers } from "@/lib/db/schema/auth";
import { captureServerEvent, ANONYMOUS_DISTINCT_ID } from "@/lib/posthog-server";

/**
 * Completes double opt-in.
 *
 * GET rather than POST because it is reached from a link in an email, and the
 * token is single-use: it is cleared on success, so a forwarded or archived
 * message cannot re-confirm an address someone has since unsubscribed.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !DATABASE_CONFIGURED) {
    return NextResponse.redirect(new URL("/subscribe?confirm=invalid", request.url));
  }

  const [subscriber] = await db
    .update(subscribers)
    .set({
      status: "confirmed",
      confirmedAt: new Date(),
      // Burns the token. Confirmation is not replayable.
      confirmToken: null,
      confirmTokenExpires: null,
    })
    .where(
      and(
        eq(subscribers.confirmToken, token),
        gt(subscribers.confirmTokenExpires, new Date())
      )
    )
    .returning({ sourcePage: subscribers.sourcePage });

  if (!subscriber) {
    // Expired, already used, or never existed — the reader is told the same
    // thing either way, and the page offers to send a fresh link.
    return NextResponse.redirect(new URL("/subscribe?confirm=invalid", request.url));
  }

  after(() =>
    captureServerEvent(ANONYMOUS_DISTINCT_ID, "newsletter_confirmed", {
      source_page: subscriber.sourcePage ?? "unknown",
    })
  );

  return NextResponse.redirect(new URL("/subscribe?confirm=ok", request.url));
}
