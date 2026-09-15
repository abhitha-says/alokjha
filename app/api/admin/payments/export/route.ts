import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { orders } from "@/lib/db/schema/commerce";
import { users } from "@/lib/db/schema/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { eq, and, gte, lte, ilike, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  await requireAdmin();

  if (!DATABASE_CONFIGURED) {
    return new NextResponse("Database not configured", { status: 503 });
  }

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const plan = sp.get("plan") || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
  const to = sp.get("to") ? new Date(sp.get("to")! + "T23:59:59Z") : undefined;

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(orders.status, status as "created" | "paid" | "failed" | "refunded"));
  if (plan) conditions.push(eq(orders.plan, plan as "deep_dive" | "monthly" | "annual" | "founding"));
  if (from) conditions.push(gte(orders.createdAt, from));
  if (to) conditions.push(lte(orders.createdAt, to));

  if (q) {
    const matchedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(ilike(users.email, `%${q}%`))
      .limit(500);
    if (matchedUsers.length > 0) {
      const ids = matchedUsers.map((u) => u.id);
      conditions.push(sql`${orders.userId} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}])`);
    }
  }

  const rows = await db
    .select({
      id: orders.id,
      email: users.email,
      name: users.name,
      plan: orders.plan,
      contentSlug: orders.contentSlug,
      amountPaise: orders.amountPaise,
      creditAppliedPaise: orders.creditAppliedPaise,
      currency: orders.currency,
      status: orders.status,
      razorpayOrderId: orders.razorpayOrderId,
      razorpayPaymentId: orders.razorpayPaymentId,
      foundingSeatNo: orders.foundingSeatNo,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      refundedAt: orders.refundedAt,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orders.createdAt)
    .limit(10000);

  const headers = [
    "id",
    "email",
    "name",
    "plan",
    "content_slug",
    "amount_inr",
    "credit_applied_inr",
    "currency",
    "status",
    "razorpay_order_id",
    "razorpay_payment_id",
    "founding_seat_no",
    "created_at",
    "paid_at",
    "refunded_at",
  ].join(",");

  function esc(v: unknown): string {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const lines = [
    headers,
    ...rows.map((r) =>
      [
        r.id,
        r.email,
        r.name,
        r.plan,
        r.contentSlug,
        (r.amountPaise / 100).toFixed(2),
        (r.creditAppliedPaise / 100).toFixed(2),
        r.currency,
        r.status,
        r.razorpayOrderId,
        r.razorpayPaymentId,
        r.foundingSeatNo,
        r.createdAt?.toISOString(),
        r.paidAt?.toISOString(),
        r.refundedAt?.toISOString(),
      ]
        .map(esc)
        .join(",")
    ),
  ].join("\n");

  const filename = `payments-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(lines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
