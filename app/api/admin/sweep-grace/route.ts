import "server-only";

import { NextResponse } from "next/server";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { after } from "next/server";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { subscriptions, entitlements } from "@/lib/db/schema/commerce";
import { sweepRateLimitBuckets } from "@/lib/rate-limit";


/**
 * GET /api/admin/sweep-grace
 *
 * Daily cron that expires subscriptions whose payment grace period has lapsed.
 *
 * When Razorpay cannot collect a recurring payment it sets the subscription to
 * `halted` and we store `grace_until = now() + PAYMENT_GRACE_DAYS`. The reader
 * keeps access while inside the grace window. This cron sweeps any subscription
 * where `status = 'past_due'` and `grace_until < now()`, moves it to `expired`,
 * and revokes the associated entitlement so the paywall activates on the next
 * content request.
 *
 * Authentication: CRON_SECRET header, same as publish-scheduled.
 * Vercel Cron: configured in vercel.json, runs daily at 02:00 UTC.
 */
export async function GET(request: Request) {
  // Authenticate the cron invocation.
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!DATABASE_CONFIGURED) {
    return NextResponse.json({ skipped: "no database configured" });
  }

  const now = new Date();

  // Find subscriptions whose grace period has expired.
  const expired = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      plan: subscriptions.plan,
      graceUntil: subscriptions.graceUntil,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "past_due"),
        isNotNull(subscriptions.graceUntil),
        lt(subscriptions.graceUntil, now)
      )
    );

  if (expired.length === 0) {
    return NextResponse.json({ swept: 0 });
  }

  const results: Array<{ subscriptionId: string; ok: boolean; error?: string }> = [];

  for (const sub of expired) {
    try {
      await db.transaction(async (tx) => {
        // Expire the subscription
        await tx
          .update(subscriptions)
          .set({ status: "expired" })
          .where(eq(subscriptions.id, sub.id));

        // Revoke the membership entitlement
        await tx
          .update(entitlements)
          .set({ revokedAt: now, note: "grace-period-expired" })
          .where(
            and(
              eq(entitlements.userId, sub.userId),
              eq(entitlements.kind, "membership"),
              sql`${entitlements.revokedAt} IS NULL`,
              sql`${entitlements.expiresAt} IS NOT NULL`
            )
          );
      });

      results.push({ subscriptionId: sub.id, ok: true });
    } catch (err) {
      results.push({
        subscriptionId: sub.id,
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const swept = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(
    `[sweep-grace] swept=${swept} failed=${failed}`,
    results
  );

  // Fire analytics for swept subscriptions in the background.
  // Also sweeps old rate_limit_buckets rows (>24h) to prevent table bloat.
  after(async () => {
    const rlSwept = await sweepRateLimitBuckets();
    if (rlSwept > 0) {
      console.log(`[sweep-grace] rate_limit_buckets swept=${rlSwept}`);
    }
  });

  return NextResponse.json({ swept, failed, results });
}
