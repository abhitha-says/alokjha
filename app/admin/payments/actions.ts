"use server";

import { requireAdmin, auditLog } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import {
  orders,
  entitlements,
} from "@/lib/db/schema/commerce";
import { eq, and, sql } from "drizzle-orm";
import { getRazorpayClient, RAZORPAY_CONFIGURED } from "@/lib/razorpay";

/**
 * Initiates a refund via Razorpay, revokes the entitlement, frees any
 * founding seat, and writes to the audit log — all in one database transaction.
 *
 * Returns { error } on failure, { ok: true } on success.
 */
export async function initiateRefund(
  orderId: string,
  reason: string
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireAdmin();

  if (!DATABASE_CONFIGURED) return { error: "Database not configured." };
  if (!RAZORPAY_CONFIGURED) return { error: "Razorpay not configured." };
  if (!reason.trim()) return { error: "A reason is required." };

  // Load the order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return { error: "Order not found." };
  if (order.status !== "paid") return { error: "Only paid orders can be refunded." };
  if (!order.razorpayPaymentId) return { error: "No Razorpay payment ID on this order." };

  // Call Razorpay API
  try {
    const rzp = getRazorpayClient();
    await rzp.payments.refund(order.razorpayPaymentId, {
      speed: "normal",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Razorpay error: ${msg}` };
  }

  // Update DB in one transaction: mark refunded + revoke entitlement + free seat
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        foundingSeatNo: null,
      })
      .where(eq(orders.id, orderId));

    await tx
      .update(entitlements)
      .set({ revokedAt: new Date(), note: `refund: ${reason}` })
      .where(
        and(
          eq(entitlements.sourceOrderId, orderId),
          sql`${entitlements.revokedAt} IS NULL`
        )
      );
  });

  await auditLog(actor, "refund.initiated", {
    targetType: "order",
    targetId: orderId,
    before: { status: "paid", razorpayPaymentId: order.razorpayPaymentId },
    after: { status: "refunded" },
    reason,
  });

  return { ok: true };
}
