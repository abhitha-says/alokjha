import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Money and access.
 *
 * Two rules govern everything in this file:
 *
 *   1. Price lives here, never in a request. The browser sends a plan id; the
 *      server reads the amount. If an amount can travel from client to server,
 *      someone eventually buys a ₹1,499 membership for ₹1.
 *
 *   2. Amounts are integer paise. ₹1,499 is 149900. Floating-point rupees
 *      accumulate rounding error and reconcile against a bank statement to
 *      almost-but-not-quite the right number, which is worse than being
 *      obviously wrong.
 */

export const planId = pgEnum("plan_id", [
  "deep_dive",
  "monthly",
  "annual",
  "founding",
]);

export const planInterval = pgEnum("plan_interval", ["one_time", "monthly", "yearly"]);

export const plans = pgTable("plans", {
  id: planId("id").primaryKey(),
  label: text("label").notNull(),
  /** THE price. Server-side truth. */
  amountPaise: integer("amount_paise").notNull(),
  currency: text("currency").notNull().default("INR"),
  interval: planInterval("interval").notNull(),
  /** Null for everything except Founding, which is capped at 200. */
  seatLimit: integer("seat_limit"),
  /** Set only for recurring plans. Founding and single Deep Dives have none. */
  razorpayPlanId: text("razorpay_plan_id"),
  active: boolean("active").notNull().default(true),
});

export const orderStatus = pgEnum("order_status", [
  "created",
  "paid",
  "failed",
  "refunded",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    plan: planId("plan").notNull(),

    /** Set only when buying one Deep Dive. */
    contentSlug: text("content_slug"),

    amountPaise: integer("amount_paise").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: orderStatus("status").notNull().default("created"),

    /** Credit applied from a ₹299 purchase upgraded within 7 days. */
    creditAppliedPaise: integer("credit_applied_paise").notNull().default(0),

    razorpayOrderId: text("razorpay_order_id").notNull(),
    razorpayPaymentId: text("razorpay_payment_id"),

    /**
     * Founding Membership is one payment for permanent access, capped at the
     * first 200 buyers. `SELECT count(*) < 200` then insert is a race — two
     * concurrent checkouts both read 199 and 201 seats get sold. The unique
     * constraint is the only thing that holds the promise under concurrency.
     *
     * A refund nulls this and frees the seat. Nothing else does.
     */
    foundingSeatNo: integer("founding_seat_no"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("orders_razorpay_order_id_idx").on(table.razorpayOrderId),
    // Idempotency at the storage layer: a replayed webhook cannot record the
    // same Razorpay payment against a second order.
    uniqueIndex("orders_razorpay_payment_id_idx").on(table.razorpayPaymentId),
    uniqueIndex("orders_founding_seat_idx").on(table.foundingSeatNo),
    index("orders_user_idx").on(table.userId, table.createdAt),
    index("orders_status_idx").on(table.status, table.createdAt),
    check(
      "orders_founding_seat_range",
      sql`${table.foundingSeatNo} IS NULL OR (${table.foundingSeatNo} BETWEEN 1 AND 200)`
    ),
    check("orders_amount_non_negative", sql`${table.amountPaise} >= 0`),
  ]
);

export const subscriptionStatus = pgEnum("subscription_status", [
  "created",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);

/**
 * Monthly and annual only.
 *
 * Founding is a one-time order, so it has no row here: no renewal, no
 * dunning, no churn. Modelling it as a subscription would put ₹999 of
 * one-time revenue into the MRR line and quietly overstate recurring income.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    plan: planId("plan").notNull(),
    razorpaySubscriptionId: text("razorpay_subscription_id").notNull(),
    status: subscriptionStatus("status").notNull().default("created"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),

    /**
     * PAYMENT_GRACE_DAYS after a failed charge. Access continues until this
     * passes — a card expiring should not lock someone out of what they have
     * been paying for mid-read.
     */
    graceUntil: timestamp("grace_until", { withTimezone: true }),

    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subscriptions_razorpay_id_idx").on(table.razorpaySubscriptionId),
    index("subscriptions_user_idx").on(table.userId),
    index("subscriptions_status_idx").on(table.status, table.currentPeriodEnd),
  ]
);

export const entitlementKind = pgEnum("entitlement_kind", ["membership", "deep_dive"]);

/**
 * The one table `lib/access.ts` reads.
 *
 * Deliberately denormalised away from orders and subscriptions: access is
 * checked on every Deep Dive request, and it must not depend on joining three
 * tables and reasoning about payment state at read time. Payments write here;
 * reads never look anywhere else.
 */
export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: entitlementKind("kind").notNull(),

    /** Set for `deep_dive`, null for `membership`. */
    contentSlug: text("content_slug"),

    /**
     * Which plan granted a membership. Denormalised from orders/subscriptions
     * on purpose: the account page names the reader's plan, and this table
     * exists so that an access check never has to join to payment records at
     * read time. Null for `deep_dive` entitlements.
     */
    plan: planId("plan"),

    sourceOrderId: uuid("source_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    sourceSubscriptionId: uuid("source_subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" }
    ),

    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),

    /**
     * Null means permanent — a bought Deep Dive, or Founding Membership.
     * A single ₹299 purchase outlives a lapsed membership by design.
     */
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /** Why, when granted or revoked by an admin rather than by a payment. */
    note: text("note"),
  },
  (table) => [
    index("entitlements_lookup_idx").on(table.userId, table.kind, table.contentSlug),
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * Sequential and gapless, which means it is allocated inside the payment
     * transaction rather than when the PDF renders. GST filings reject gaps.
     */
    number: text("number").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "restrict",
    }),
    subtotalPaise: integer("subtotal_paise").notNull(),
    gstPaise: integer("gst_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    hsnSac: text("hsn_sac"),
    /** Place of supply. Decides CGST+SGST versus IGST. */
    buyerState: text("buyer_state"),
    pdfUrl: text("pdf_url"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("invoices_number_idx").on(table.number)]
);

/**
 * Every webhook Razorpay sends, stored before it is acted on.
 *
 * The unique constraint on `providerEventId` IS the idempotency mechanism.
 * Razorpay retries on any non-200, and without this a retry grants a second
 * entitlement, double-credits an upgrade, or issues a second invoice number.
 * Insert first, act second; a duplicate-key violation means "already done".
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("razorpay"),
    providerEventId: text("provider_event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (table) => [
    uniqueIndex("webhook_events_provider_event_idx").on(
      table.provider,
      table.providerEventId
    ),
    index("webhook_events_unprocessed_idx").on(table.processedAt),
  ]
);

export type Plan = typeof plans.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
