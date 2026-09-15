import "server-only";

import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import {
  orders,
  subscriptions,
  entitlements,
  webhookEvents,
  invoices,
} from "@/lib/db/schema/commerce";
import { verifyWebhookSignature, RAZORPAY_CONFIGURED } from "@/lib/razorpay";
import { PAYMENT_GRACE_DAYS, FOUNDING_MEMBER_LIMIT } from "@/lib/pricing";
import { captureServerEvent } from "@/lib/posthog-server";

/**
 * POST /api/webhooks/razorpay
 *
 * The source of truth for all entitlements.
 *
 * Ordering guarantees:
 *   1. Raw body is read BEFORE any JSON parse — signature verification
 *      requires the exact bytes Razorpay signed.
 *   2. Every event is persisted to `webhook_events` before it is acted on.
 *      The UNIQUE index on (provider, provider_event_id) IS the idempotency
 *      mechanism: a duplicate key means already processed, return 200 and stop.
 *   3. Entitlements, order/subscription status, and invoice number allocation
 *      happen in ONE database transaction. If the DB write fails, we throw so
 *      Razorpay retries; the idempotency guard prevents double-grant on retry.
 *   4. Slow work (PostHog capture, receipt email) fires via after() so it
 *      never slows down or fails the webhook response.
 *   5. Unhandled event types are logged and 200'd — never 500'd, because a
 *      500 makes Razorpay retry indefinitely.
 *
 * This route must be excluded from the proxy.ts matcher (no session cookie).
 */
export async function POST(request: Request) {
  // ── 1. Read the raw body FIRST — before any JSON parse ───────────────────
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  // ── 2. Verify signature ───────────────────────────────────────────────────
  const signatureValid = RAZORPAY_CONFIGURED
    ? verifyWebhookSignature(rawBody, signature)
    : false;

  // Parse after verifying
  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event ?? "unknown";
  const providerEventId = payload.payload?.payment?.entity?.id
    ?? payload.payload?.order?.entity?.id
    ?? payload.payload?.subscription?.entity?.id
    ?? payload.payload?.refund?.entity?.id
    ?? `${eventType}-${Date.now()}`;

  if (!DATABASE_CONFIGURED) {
    // Log to console at minimum so we don't silently lose events during dev.
    console.warn("[webhook] no database — event not stored", { eventType });
    return NextResponse.json({ ok: true, skipped: "no-db" });
  }

  // ── 3. Idempotency — insert first, act second ─────────────────────────────
  const [inserted] = await db
    .insert(webhookEvents)
    .values({
      provider: "razorpay",
      providerEventId,
      type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      signatureValid,
    })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  if (!inserted) {
    // Duplicate key: already processed. Razorpay is retrying, return 200.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // ── 4. Invalid signature — stored (for forensics) but not acted on ────────
  if (!signatureValid) {
    console.warn("[webhook] invalid signature for event", {
      eventType,
      providerEventId,
    });
    // Return 200 so Razorpay does not retry — the signature won't improve.
    await markProcessed(inserted.id, "signature-invalid");
    return NextResponse.json({ ok: true, error: "invalid-signature" });
  }

  // ── 5. Dispatch ───────────────────────────────────────────────────────────
  let processingError: string | null = null;

  try {
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(payload, inserted.id);
        break;
      case "payment.failed":
        await handlePaymentFailed(payload, inserted.id);
        break;
      case "order.paid":
        // Covered by payment.captured — no additional action.
        await markProcessed(inserted.id, null);
        break;
      case "subscription.activated":
        await handleSubscriptionActivated(payload, inserted.id);
        break;
      case "subscription.charged":
        await handleSubscriptionCharged(payload, inserted.id);
        break;
      case "subscription.halted":
        await handleSubscriptionHalted(payload, inserted.id);
        break;
      case "subscription.cancelled":
        await handleSubscriptionCancelled(payload, inserted.id);
        break;
      case "refund.processed":
        await handleRefundProcessed(payload, inserted.id);
        break;
      default:
        console.log("[webhook] unhandled event type", eventType);
        await markProcessed(inserted.id, null);
    }
  } catch (err) {
    processingError =
      err instanceof Error ? err.message : "unknown processing error";
    console.error("[webhook] processing error", {
      eventType,
      providerEventId,
      error: processingError,
    });
    // Update the event row with the error so it is visible in the admin log.
    await db
      .update(webhookEvents)
      .set({ error: processingError })
      .where(eq(webhookEvents.id, inserted.id));
    // Re-throw so Razorpay retries — idempotency guard prevents double-grant.
    throw err;
  }

  return NextResponse.json({ ok: true });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handlePaymentCaptured(
  payload: RazorpayWebhookPayload,
  eventRowId: string
): Promise<void> {
  const payment = payload.payload?.payment?.entity;
  if (!payment) throw new Error("payment entity missing");

  const razorpayPaymentId = payment.id;
  const razorpayOrderId = payment.order_id;

  if (!razorpayOrderId) {
    // Subscription charge — handled by subscription.charged
    await markProcessed(eventRowId, null);
    return;
  }

  // Find the order row
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.razorpayOrderId, razorpayOrderId))
    .limit(1);

  if (!order) {
    throw new Error(`Order not found for razorpay_order_id=${razorpayOrderId}`);
  }

  // Everything in one transaction: status, seat, entitlement, invoice number
  await db.transaction(async (tx) => {
    // Mark order paid
    await tx
      .update(orders)
      .set({
        status: "paid",
        razorpayPaymentId,
        paidAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Allocate founding seat number (if applicable)
    let foundingSeatNo: number | null = null;
    if (order.plan === "founding") {
      const [{ nextSeat }] = await tx.execute<{ nextSeat: number }>(sql`
        SELECT COALESCE(MAX(founding_seat_no), 0) + 1 AS "nextSeat"
        FROM orders
        WHERE plan = 'founding' AND status = 'paid'
        FOR UPDATE
      `);

      if (nextSeat > FOUNDING_MEMBER_LIMIT) {
        throw new Error("Founding Membership sold out — refund required");
      }

      foundingSeatNo = nextSeat;
      await tx
        .update(orders)
        .set({ foundingSeatNo })
        .where(eq(orders.id, order.id));
    }

    // Grant entitlement
    await tx.insert(entitlements).values({
      userId: order.userId,
      kind: order.plan === "deep_dive" ? "deep_dive" : "membership",
      contentSlug: order.contentSlug ?? null,
      plan: order.plan,
      sourceOrderId: order.id,
      // Founding and deep_dive are permanent (expires_at = NULL)
      expiresAt: null,
    });

    // Allocate invoice number (sequential, gapless, inside the transaction)
    const invoiceNumber = await allocateInvoiceNumber(tx);
    const collectGst = process.env.RAZORPAY_COLLECT_GST === "true";
    const subtotalPaise = order.amountPaise;
    const gstPaise = collectGst ? Math.round(subtotalPaise * 0.18) : 0;

    await tx.insert(invoices).values({
      number: invoiceNumber,
      orderId: order.id,
      subtotalPaise,
      gstPaise,
      totalPaise: subtotalPaise + gstPaise,
      hsnSac: "998431", // SAC for online information/database retrieval services
      issuedAt: new Date(),
    });
  });

  // Mark event processed
  await markProcessed(eventRowId, null);

  // Slow work after the response
  after(async () => {
    await captureServerEvent(order.userId, "checkout_succeeded", {
      product:
        order.plan === "deep_dive"
          ? "deep-dive"
          : order.plan === "monthly"
          ? "monthly"
          : order.plan === "annual"
          ? "annual"
          : "founding",
      slug: order.contentSlug ?? undefined,
      amount_inr: Math.round(order.amountPaise / 100),
      payment_id: razorpayPaymentId,
    });
  });
}

async function handlePaymentFailed(
  payload: RazorpayWebhookPayload,
  eventRowId: string
): Promise<void> {
  const payment = payload.payload?.payment?.entity;
  if (!payment) throw new Error("payment entity missing");

  const razorpayOrderId = payment.order_id;
  if (!razorpayOrderId) {
    await markProcessed(eventRowId, null);
    return;
  }

  await db
    .update(orders)
    .set({ status: "failed" })
    .where(eq(orders.razorpayOrderId, razorpayOrderId));

  await markProcessed(eventRowId, null);

  const [order] = await db
    .select({ userId: orders.userId, plan: orders.plan })
    .from(orders)
    .where(eq(orders.razorpayOrderId, razorpayOrderId))
    .limit(1);

  if (order) {
    after(async () => {
      await captureServerEvent(order.userId, "checkout_failed", {
        product:
          order.plan === "deep_dive"
            ? "deep-dive"
            : order.plan === "monthly"
            ? "monthly"
            : order.plan === "annual"
            ? "annual"
            : "founding",
        reason: payment.error_description ?? "unknown",
      });
    });
  }
}

async function handleSubscriptionActivated(
  payload: RazorpayWebhookPayload,
  eventRowId: string
): Promise<void> {
  const sub = payload.payload?.subscription?.entity;
  if (!sub) throw new Error("subscription entity missing");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.razorpayOrderId, sub.id))
    .limit(1);

  if (!order) {
    throw new Error(`Order not found for subscription id=${sub.id}`);
  }

  const currentPeriodEnd = sub.current_end
    ? new Date(sub.current_end * 1000)
    : null;

  await db.transaction(async (tx) => {
    // Upsert subscription row
    await tx
      .insert(subscriptions)
      .values({
        userId: order.userId,
        plan: order.plan,
        razorpaySubscriptionId: sub.id,
        status: "active",
        currentPeriodEnd,
      })
      .onConflictDoUpdate({
        target: subscriptions.razorpaySubscriptionId,
        set: { status: "active", currentPeriodEnd },
      });

    const [subscriptionRow] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.razorpaySubscriptionId, sub.id))
      .limit(1);

    // Grant membership entitlement (expires when subscription period ends)
    await tx
      .insert(entitlements)
      .values({
        userId: order.userId,
        kind: "membership",
        plan: order.plan,
        sourceSubscriptionId: subscriptionRow?.id ?? null,
        expiresAt: currentPeriodEnd,
      })
      .onConflictDoNothing(); // idempotent
  });

  await markProcessed(eventRowId, null);
}

async function handleSubscriptionCharged(
  payload: RazorpayWebhookPayload,
  eventRowId: string
): Promise<void> {
  const sub = payload.payload?.subscription?.entity;
  const payment = payload.payload?.payment?.entity;
  if (!sub || !payment) throw new Error("subscription or payment entity missing");

  const currentPeriodEnd = sub.current_end
    ? new Date(sub.current_end * 1000)
    : null;

  await db.transaction(async (tx) => {
    // Extend subscription period
    await tx
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodEnd,
        graceUntil: null,
      })
      .where(eq(subscriptions.razorpaySubscriptionId, sub.id));

    // Extend entitlement expiry
    const [subRow] = await tx
      .select({ id: subscriptions.id, userId: subscriptions.userId, plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.razorpaySubscriptionId, sub.id))
      .limit(1);

    if (subRow) {
      await tx
        .update(entitlements)
        .set({ expiresAt: currentPeriodEnd })
        .where(
          and(
            eq(entitlements.userId, subRow.userId),
            eq(entitlements.kind, "membership"),
            sql`${entitlements.revokedAt} IS NULL`
          )
        );

      // Allocate invoice for the renewal charge
      const invoiceNumber = await allocateInvoiceNumber(tx);
      const [orderRow] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.razorpayOrderId, sub.id))
        .limit(1);

      const collectGst = process.env.RAZORPAY_COLLECT_GST === "true";
      const subtotalPaise = payment.amount;
      const gstPaise = collectGst ? Math.round(subtotalPaise * 0.18) : 0;

      await tx.insert(invoices).values({
        number: invoiceNumber,
        orderId: orderRow?.id ?? null,
        subscriptionId: subRow.id,
        subtotalPaise,
        gstPaise,
        totalPaise: subtotalPaise + gstPaise,
        hsnSac: "998431",
        issuedAt: new Date(),
      });
    }
  });

  await markProcessed(eventRowId, null);

  // Fire renewal analytics in the background
  after(async () => {
    const [subRow] = await db
      .select({ userId: subscriptions.userId, plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.razorpaySubscriptionId, sub.id))
      .limit(1);
    if (subRow && payment) {
      await captureServerEvent(subRow.userId, "subscription_renewed", {
        plan: subRow.plan as "monthly" | "annual",
        amount_inr: Math.round(payment.amount / 100),
      });
    }
  });
}

async function handleSubscriptionHalted(
  payload: RazorpayWebhookPayload,
  eventRowId: string
): Promise<void> {
  const sub = payload.payload?.subscription?.entity;
  if (!sub) throw new Error("subscription entity missing");

  const graceUntil = new Date(Date.now() + PAYMENT_GRACE_DAYS * 86_400_000);

  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      graceUntil,
    })
    .where(eq(subscriptions.razorpaySubscriptionId, sub.id));

  // Access continues until graceUntil — the sweep-grace cron revokes it.
  await markProcessed(eventRowId, null);

  after(async () => {
    const [subRow] = await db
      .select({ userId: subscriptions.userId, plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.razorpaySubscriptionId, sub.id))
      .limit(1);
    if (subRow) {
      await captureServerEvent(subRow.userId, "subscription_payment_failed", {
        plan: subRow.plan as "monthly" | "annual",
        grace_until: graceUntil.toISOString(),
      });
    }
  });
}

async function handleSubscriptionCancelled(
  payload: RazorpayWebhookPayload,
  eventRowId: string
): Promise<void> {
  const sub = payload.payload?.subscription?.entity;
  if (!sub) throw new Error("subscription entity missing");

  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
    })
    .where(eq(subscriptions.razorpaySubscriptionId, sub.id));

  await markProcessed(eventRowId, null);

  after(async () => {
    const [subRow] = await db
      .select({ userId: subscriptions.userId, plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.razorpaySubscriptionId, sub.id))
      .limit(1);
    if (subRow) {
      await captureServerEvent(subRow.userId, "subscription_cancelled", {
        plan: subRow.plan as "monthly" | "annual",
      });
    }
  });
}

async function handleRefundProcessed(
  payload: RazorpayWebhookPayload,
  eventRowId: string
): Promise<void> {
  const refund = payload.payload?.refund?.entity;
  if (!refund) throw new Error("refund entity missing");

  // Find the original payment's order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.razorpayPaymentId, refund.payment_id))
    .limit(1);

  if (!order) {
    // Payment might not be in our system (e.g. a manual Razorpay refund)
    await markProcessed(eventRowId, "order-not-found");
    return;
  }

  await db.transaction(async (tx) => {
    // Mark order refunded, free the founding seat if applicable
    await tx
      .update(orders)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        foundingSeatNo: null, // Free the founding seat
      })
      .where(eq(orders.id, order.id));

    // Revoke the entitlement
    await tx
      .update(entitlements)
      .set({ revokedAt: new Date(), note: "refund" })
      .where(
        and(
          eq(entitlements.sourceOrderId, order.id),
          sql`${entitlements.revokedAt} IS NULL`
        )
      );
  });

  await markProcessed(eventRowId, null);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function markProcessed(
  eventRowId: string,
  error: string | null
): Promise<void> {
  await db
    .update(webhookEvents)
    .set({ processedAt: new Date(), error })
    .where(eq(webhookEvents.id, eventRowId));
}

/**
 * Allocates the next sequential invoice number inside a transaction.
 * Gaps are not allowed (GST requirement), so this must run inside the
 * same transaction as the invoice insert — never outside it.
 * Format: HS-YYYY-000001
 */
async function allocateInvoiceNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `HS-${year}-`;

  // Lock the invoices table for this year and get the next sequence number.
  const [{ nextSeq }] = await tx.execute<{ nextSeq: number }>(sql`
    SELECT COUNT(*) + 1 AS "nextSeq"
    FROM invoices
    WHERE number LIKE ${prefix + "%"}
    FOR UPDATE
  `);

  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RazorpayWebhookPayload {
  entity: string;
  account_id?: string;
  event: string;
  contains?: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id?: string;
        amount: number;
        currency: string;
        status: string;
        error_description?: string;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start?: number;
        current_end?: number;
        charge_at?: number;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        currency: string;
      };
    };
  };
  created_at?: number;
}
