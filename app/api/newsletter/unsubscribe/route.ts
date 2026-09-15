import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { subscribers } from "@/lib/db/schema/auth";

/**
 * One-click unsubscribe.
 *
 * Handles both GET (the link a reader clicks) and POST (RFC 8058, which Gmail
 * and Yahoo now require of bulk senders — their clients POST here directly
 * from the "unsubscribe" button in the message header).
 *
 * No confirmation step and no sign-in. Making someone log in to stop receiving
 * email is how a list gets marked as spam instead, which costs far more than
 * the occasional accidental unsubscribe.
 *
 * The token is permanent and per-subscriber, so it keeps working in an email
 * sent two years ago.
 */
async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token || !DATABASE_CONFIGURED) return false;

  const [row] = await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(subscribers.unsubscribeToken, token))
    .returning({ id: subscribers.id });

  return Boolean(row);
}

export async function GET(request: NextRequest) {
  const ok = await unsubscribe(request.nextUrl.searchParams.get("token"));
  return NextResponse.redirect(
    new URL(`/subscribe?unsubscribe=${ok ? "ok" : "invalid"}`, request.url)
  );
}

export async function POST(request: NextRequest) {
  await unsubscribe(request.nextUrl.searchParams.get("token"));
  // RFC 8058 expects a 200 regardless. A mail client is not going to show the
  // reader an error, and a non-200 here counts against sender reputation.
  return new NextResponse(null, { status: 200 });
}
