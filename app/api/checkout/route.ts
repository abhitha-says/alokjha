import "server-only";

import { NextResponse } from "next/server";
import { and, gte, eq } from "drizzle-orm";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { plans, orders } from "@/lib/db/schema/commerce";
import { getRazorpayClient, RAZORPAY_CONFIGURED } from "@/lib/razorpay";
import { UPGRADE_CREDIT_DAYS, FOUNDING_MEMBER_LIMIT } from "@/lib/pricing";
import { captureServerEvent } from "@/lib/posthog-server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/checkout
 *
 * Creates a Razorpay order and an `orders` row with status = 'created'.
 * The browser then opens Razorpay Checkout using the returned order ID.
 * Entitlements are NOT granted here — they are granted from the webhook when
 * Razorpay confirms payment, so a reader who closes the tab mid-payment still
 * gets access, and a forged success callback does not.
 *
 * Body: { planId: "deep_dive" | "monthly" | "annual" | "founding", slug?: string }
 *
 * Response: { razorpayOrderId, razorpaySubscriptionId?, keyId, amountPaise, currency }
 *
 * Note on subscriptions vs orders:
 *   - monthly / annual → Razorpay Subscription (the Checkout SDK handles the
 *     recurring UI and collects card/UPI mandate automatically).
 *   - deep_dive / founding → Razorpay Order (one-time payment).
 */
export async function POST(request: Request) {
  if (!DATABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  if (!RAZORPAY_CONFIGURED) {
    return NextResponse.json(
      { error: "Payment gateway not configured" },
      { status: 503 }
    );
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const userId = session.user.id;
  const userEmail = session.user.email ?? "";

  // Rate limit: 5 checkout attempts per user per hour.
  // Prevents checkout-spam that pollutes Razorpay order counts and wastes
  // founding-seat pre-flight queries. 5 per hour is far more generous than
  // any genuine buyer ever needs.
  const rl = await rateLimit(`checkout:${userId}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("planId" in body) ||
    typeof (body as { planId: unknown }).planId !== "string"
  ) {
    return NextResponse.json({ error: "planId required" }, { status: 400 });
  }

  const { planId, slug } = body as { planId: string; slug?: string };

  const validPlanIds = ["deep_dive", "monthly", "annual", "founding"] as const;
  if (!validPlanIds.includes(planId as (typeof validPlanIds)[number])) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  if (planId === "deep_dive" && !slug) {
    return NextResponse.json(
      { error: "slug required for deep_dive plan" },
      { status: 400 }
    );
  }

  // ── Price — the server reads it; the client never sends an amount ─────────
  const [plan] = await db
    .select({
      amountPaise: plans.amountPaise,
      razorpayPlanId: plans.razorpayPlanId,
      seatLimit: plans.seatLimit,
      active: plans.active,
    })
    .from(plans)
    .where(eq(plans.id, planId as (typeof validPlanIds)[number]))
    .limit(1);

  if (!plan || !plan.active) {
    return NextResponse.json(
      { error: "Plan not available" },
      { status: 404 }
    );
  }

  // ── Founding seat availability — belt-and-suspenders before DB constraint ─
  // The real enforcement is the UNIQUE + CHECK constraint on
  // orders.founding_seat_no. This is a cheap pre-flight so we return a
  // helpful error message rather than a constraint violation.
  if (planId === "founding") {
    const soldSeats = await db.$count(
      orders,
      and(eq(orders.plan, "founding"), eq(orders.status, "paid"))
    );

    if (soldSeats >= (plan.seatLimit ?? FOUNDING_MEMBER_LIMIT)) {
      return NextResponse.json(
        { error: "Founding Membership is sold out" },
        { status: 409 }
      );
    }
  }

  // ── Upgrade credit (₹299 purchase credited against annual, within 7 days) ─
  let creditAppliedPaise = 0;
  if (planId === "annual") {
    const cutoff = new Date(Date.now() - UPGRADE_CREDIT_DAYS * 86_400_000);
    const [recentPurchase] = await db
      .select({ amountPaise: orders.amountPaise })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.plan, "deep_dive"),
          eq(orders.status, "paid"),
          gte(orders.paidAt, cutoff)
        )
      )
      .limit(1);

    if (recentPurchase) {
      // Cap credit at the annual plan price (cannot make it free or negative).
      creditAppliedPaise = Math.min(
        recentPurchase.amountPaise,
        plan.amountPaise - 100 // leave at least ₹1 so Razorpay doesn't reject ₹0
      );
    }
  }

  const chargeablePaise = plan.amountPaise - creditAppliedPaise;
  const rzp = getRazorpayClient();

  // ── Recurring plans: create a Razorpay Subscription ───────────────────────
  if (planId === "monthly" || planId === "annual") {
    if (!plan.razorpayPlanId) {
      return NextResponse.json(
        {
          error:
            "Razorpay plan ID not configured. Run: UPDATE plans SET razorpay_plan_id = '<id>' WHERE id = '" +
            planId +
            "'",
        },
        { status: 503 }
      );
    }

    let rzpSubscription: { id: string };
    try {
      rzpSubscription = (await rzp.subscriptions.create({
        plan_id: plan.razorpayPlanId,
        total_count: planId === "annual" ? 12 : 0, // 0 = until cancelled for monthly
        quantity: 1,
        customer_notify: 1,
        notify_info: {
          notify_email: userEmail,
        },
      })) as { id: string };
    } catch (err) {
      console.error("[checkout] Razorpay subscription create failed", err);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 502 }
      );
    }

    // Write the order row (no amount for subscriptions — Razorpay charges via plan).
    const [order] = await db
      .insert(orders)
      .values({
        userId,
        plan: planId,
        amountPaise: plan.amountPaise,
        creditAppliedPaise,
        razorpayOrderId: rzpSubscription.id, // subscription ID doubles as receipt key
        status: "created",
      })
      .returning({ id: orders.id });

    after(async () => {
      await captureServerEvent(userId, "checkout_started", {
        product: planId as "monthly" | "annual",
        amount_inr: Math.round(plan.amountPaise / 100),
      });
    });

    return NextResponse.json({
      razorpaySubscriptionId: rzpSubscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amountPaise: plan.amountPaise,
      currency: "INR",
      orderId: order.id,
    });
  }

  // ── One-time plans: create a Razorpay Order ────────────────────────────────
  let rzpOrder: { id: string };
  try {
    rzpOrder = (await rzp.orders.create({
      amount: chargeablePaise,
      currency: "INR",
      receipt: `hs-${Date.now()}`,
    })) as { id: string };
  } catch (err) {
    console.error("[checkout] Razorpay order create failed", err);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 502 }
    );
  }

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      plan: planId as "deep_dive" | "founding",
      contentSlug: slug ?? null,
      amountPaise: chargeablePaise,
      creditAppliedPaise,
      razorpayOrderId: rzpOrder.id,
      status: "created",
    })
    .returning({ id: orders.id });

  after(async () => {
    await captureServerEvent(userId, "checkout_started", {
      product: planId === "deep_dive" ? "deep-dive" : "founding",
      slug: slug,
      amount_inr: Math.round(chargeablePaise / 100),
    });
  });

  return NextResponse.json({
    razorpayOrderId: rzpOrder.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    amountPaise: chargeablePaise,
    currency: "INR",
    orderId: order.id,
    creditAppliedPaise,
  });
}
