import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { users, subscribers, adminAuditLog } from "@/lib/db/schema/auth";
import { orders, entitlements, subscriptions } from "@/lib/db/schema/commerce";
import { eq } from "drizzle-orm";

/**
 * GET /api/admin/readers/export?userId=…
 *
 * Returns all data held about a reader as a downloadable JSON file.
 * This is the DPDP/GDPR "data portability" obligation.
 */
export async function GET(request: NextRequest) {
  await requireAdmin();

  if (!DATABASE_CONFIGURED) {
    return new NextResponse("Database not configured", { status: 503 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return new NextResponse("userId is required", { status: 400 });
  }

  const [
    userRows,
    subscriberRows,
    orderRows,
    entitlementRows,
    subscriptionRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(subscribers).where(eq(subscribers.userId, userId)),
    db.select().from(orders).where(eq(orders.userId, userId)),
    db.select().from(entitlements).where(eq(entitlements.userId, userId)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
    db
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.targetId, userId))
      .limit(200),
  ]);

  const user = userRows[0];
  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Strip sensitive server-only fields
  const { passwordHash, totpSecret, ...safeUser } = user;

  const data = {
    exported_at: new Date().toISOString(),
    user: safeUser,
    newsletter_subscriptions: subscriberRows,
    orders: orderRows,
    entitlements: entitlementRows,
    subscriptions: subscriptionRows,
    admin_audit_entries: auditRows,
  };

  const filename = `reader-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
