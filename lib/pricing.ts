/**
 * Prices and access constants.
 *
 * Deliberately free of imports. `lib/access.ts` pulls in Auth.js and the
 * database, which makes it unusable from a standalone script — and the seed
 * that writes these amounts into the `plans` table has to read them from
 * somewhere. Keeping the numbers in a module with no dependencies means the
 * marketing pages, the access rules and the seed all agree by construction
 * rather than by somebody remembering to update three files.
 *
 * `lib/access.ts` re-exports everything here, so existing imports are
 * unaffected.
 */

/**
 * Share of a Deep Dive body a locked reader sees. The spec is 20–25%: aim for
 * the target and never cross the ceiling, since the cut lands on a paragraph
 * boundary and a long closing paragraph would otherwise overshoot.
 */
export const PREVIEW_SHARE = 0.22;
export const PREVIEW_MAX_SHARE = 0.25;

/** Days within which a ₹299 purchase is credited against annual membership. */
export const UPGRADE_CREDIT_DAYS = 7;

/** Grace period on a failed recurring payment before access is suspended. */
export const PAYMENT_GRACE_DAYS = 7;

/**
 * Founding Membership is capped at the first 200 buyers.
 *
 * Enforced by a UNIQUE index and a CHECK on `orders.founding_seat_no`, not by
 * this constant — a count-then-insert loses the race under concurrency and
 * oversells a number that was advertised publicly.
 */
export const FOUNDING_MEMBER_LIMIT = 200;

/**
 * Display amounts, in whole rupees.
 *
 * These are what the marketing pages render. What a reader is actually charged
 * comes from `plans.amount_paise` in the database, seeded from here. The two
 * must never disagree: a site that advertises ₹1,499 and charges ₹1,999 is a
 * chargeback, not a bug report.
 */
export const PRICING = {
  signal: { amount: 0, label: "Free" },
  deepDive: { amount: 299, label: "₹299" },
  monthly: { amount: 199, label: "₹199" },
  annual: { amount: 1499, label: "₹1,499" },
  /** One payment, permanent access. Not a subscription. */
  founding: { amount: 999, label: "₹999" },
} as const;

/** ₹199 × 12 = ₹2,388 against ₹1,499 — the saving the annual plan is sold on. */
export const ANNUAL_SAVING = PRICING.monthly.amount * 12 - PRICING.annual.amount;

export type MembershipPlan = "none" | "monthly" | "annual" | "founding";
