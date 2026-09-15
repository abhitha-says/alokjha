import { and, eq, isNull, or, gt } from "drizzle-orm";
import { auth } from "./auth";
import { db, DATABASE_CONFIGURED } from "./db";
import { entitlements as entitlementsTable } from "./db/schema/commerce";
import { content } from "./db/schema/content";
import { subscribers } from "./db/schema/auth";

/**
 * Human Signals access model.
 *
 * The central principle, in the client's words:
 *   Signals are free to discover. Deep Dives can be bought individually.
 *   Membership unlocks the complete body of work.
 *
 * Everything in this file runs on the server only. A locked Deep Dive must
 * never have its full body serialised into the page — the preview is cut
 * server-side and the remainder is simply not sent. No CSS blur, no overlay.
 */

/**
 * Prices and access constants live in `lib/pricing.ts`, which has no imports
 * so that standalone scripts can read them. Re-exported here because every
 * page already imports them from this module.
 */
export {
  PREVIEW_SHARE,
  PREVIEW_MAX_SHARE,
  UPGRADE_CREDIT_DAYS,
  PAYMENT_GRACE_DAYS,
  FOUNDING_MEMBER_LIMIT,
  PRICING,
  ANNUAL_SAVING,
  type MembershipPlan,
} from "./pricing";

import type { MembershipPlan } from "./pricing";

export interface Entitlements {
  signedIn: boolean;
  email: string | null;
  plan: MembershipPlan;
  /** True while payments are current (or inside the grace period). */
  membershipActive: boolean;
  /** Slugs of individually purchased Deep Dives. Access does not lapse. */
  purchasedDeepDives: string[];
  /** Free weekly Signal by email. Grants no Deep Dive access on its own. */
  emailSubscriber: boolean;
}

export const ANONYMOUS: Entitlements = {
  signedIn: false,
  email: null,
  plan: "none",
  membershipActive: false,
  purchasedDeepDives: [],
  emailSubscriber: false,
};

/**
 * The Founding Five, released free and permanently.
 *
 * Retained as the migration's parity target and as the fallback while the
 * content tables are still being populated. The live answer comes from
 * `content.is_free_edition`, so releasing a new free edition is a toggle in
 * the admin panel rather than a code deploy.
 */
export const FREE_DEEP_DIVE_SLUGS: readonly string[] = [
  "the-choice-trap",
  "the-indian-buyer",
  "when-humans-trust-machines",
  "after-the-role-changes",
  "the-founder-mind-under-pressure",
];

/**
 * Synchronous fallback, for callers that cannot await — the search route and
 * listing pages that only need to label a card. The authoritative check is
 * `isFreeDeepDiveLive`, which every access decision uses.
 */
export function isFreeDeepDive(slug: string): boolean {
  return FREE_DEEP_DIVE_SLUGS.includes(slug);
}

/** The live answer, from the content table. */
export async function isFreeDeepDiveLive(slug: string): Promise<boolean> {
  if (!DATABASE_CONFIGURED) return isFreeDeepDive(slug);

  const [row] = await db
    .select({ isFree: content.isFreeEdition })
    .from(content)
    .where(and(eq(content.slug, slug), eq(content.kind, "deep_dive")))
    .limit(1);

  // Falling back rather than denying: if the content tables are not yet
  // populated, a Founding Five edition must still read free. A migration in
  // progress should never put a free edition behind the paywall.
  return row?.isFree ?? isFreeDeepDive(slug);
}

/**
 * Reads the reader's entitlements.
 *
 * Replaces the unsigned JSON cookie this function used to trust. The session
 * is now an opaque token backed by a database row, and every grant below comes
 * from a payment that Razorpay confirmed to our webhook.
 *
 * One indexed query. Called on every Deep Dive request, so it stays a single
 * round trip — `entitlements_lookup_idx` covers exactly this predicate.
 */
export async function getEntitlements(): Promise<Entitlements> {
  // No database yet, or the database is unreachable: everyone is anonymous.
  // Fail closed. The free Signals and free editions keep serving, and paid
  // content stays shut — the opposite default would hand the archive away
  // during an outage.
  if (!DATABASE_CONFIGURED) return ANONYMOUS;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return ANONYMOUS;

  // Issued together so postgres.js pipelines them into one round trip rather
  // than two sequential waits on a page that is already doing a content read.
  const [rows, subscriber] = await Promise.all([
    db
      .select({
        kind: entitlementsTable.kind,
        contentSlug: entitlementsTable.contentSlug,
        plan: entitlementsTable.plan,
      })
      .from(entitlementsTable)
      .where(
        and(
          eq(entitlementsTable.userId, userId),
          isNull(entitlementsTable.revokedAt),
          // A null expiry is permanent: a bought Deep Dive, or Founding
          // Membership. Both outlive a lapsed subscription by design.
          or(
            isNull(entitlementsTable.expiresAt),
            gt(entitlementsTable.expiresAt, new Date())
          )
        )
      ),
    db
      .select({ status: subscribers.status })
      .from(subscribers)
      .where(eq(subscribers.userId, userId))
      .limit(1),
  ]);

  const membership = rows.find((r) => r.kind === "membership");

  return {
    signedIn: true,
    email: session.user.email ?? null,
    plan: toMembershipPlan(membership?.plan),
    membershipActive: Boolean(membership),
    purchasedDeepDives: rows
      .filter((r) => r.kind === "deep_dive" && r.contentSlug)
      .map((r) => r.contentSlug!),
    emailSubscriber: subscriber[0]?.status === "confirmed",
  };
}

/**
 * `deep_dive` is a valid plan id for an order but never for a membership, so
 * it collapses to "none" here rather than widening MembershipPlan to include
 * a value that `planLabel` has no sensible wording for.
 */
function toMembershipPlan(plan: string | null | undefined): MembershipPlan {
  return plan === "monthly" || plan === "annual" || plan === "founding"
    ? plan
    : "none";
}

export type AccessReason =
  | "free-edition"
  | "membership"
  | "purchased"
  | "locked";

export interface DeepDiveAccess {
  granted: boolean;
  reason: AccessReason;
}

/**
 * The single rule that decides whether a reader sees a complete Deep Dive.
 *
 * A member reads everything while the membership is active. A one-time buyer
 * reads only what they bought, and keeps it after a membership lapses. Free
 * editions are open to everyone, signed in or not.
 */
export function resolveDeepDiveAccess(
  slug: string,
  entitlements: Entitlements
): DeepDiveAccess {
  if (isFreeDeepDive(slug)) return { granted: true, reason: "free-edition" };

  const hasMembership =
    entitlements.membershipActive && entitlements.plan !== "none";
  if (hasMembership) return { granted: true, reason: "membership" };

  if (entitlements.purchasedDeepDives.includes(slug)) {
    return { granted: true, reason: "purchased" };
  }

  return { granted: false, reason: "locked" };
}

export function planLabel(plan: MembershipPlan): string {
  switch (plan) {
    case "monthly":
      return "Monthly member";
    case "annual":
      return "Annual member";
    case "founding":
      return "Founding member";
    default:
      return "No active membership";
  }
}
