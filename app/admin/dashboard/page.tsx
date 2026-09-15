import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import {
  orders,
  subscriptions,
  entitlements,
  plans,
} from "@/lib/db/schema/commerce";
import { subscribers } from "@/lib/db/schema/auth";
import { content as contentTable } from "@/lib/db/schema/content";
import { eq, and, gte, isNull, sql, desc, ne } from "drizzle-orm";
import { paiseToRupeeLabel } from "@/lib/razorpay";

export const instant = false;

// ── Query helpers ─────────────────────────────────────────────────────────────

function startOf(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface Stats {
  revenueToday: number;
  revenue7d: number;
  revenue30d: number;
  mrr: number;
  arr: number;
  activeByPlan: { plan: string; count: number }[];
  foundingSold: number;
  foundingRemaining: number;
  newSubscribers7d: number;
  failedOrders: number;
  pastDueSubs: number;
  contentThisMonth: number;
  topDeepDives: { slug: string; title: string; revenue: number }[];
}

async function loadStats(): Promise<Stats> {
  const today = startOf(0);
  const d7 = startOf(7);
  const d30 = startOf(30);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    revTodayRows,
    rev7dRows,
    rev30dRows,
    subRows,
    activeByPlanRows,
    foundingSoldRows,
    newSubRows,
    failedOrderRows,
    pastDueRows,
    contentMonthRows,
    topDDRows,
  ] = await Promise.all([
    // Revenue today
    db
      .select({ total: sql<number>`coalesce(sum(${orders.amountPaise}), 0)` })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.paidAt, today))),

    // Revenue 7d
    db
      .select({ total: sql<number>`coalesce(sum(${orders.amountPaise}), 0)` })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.paidAt, d7))),

    // Revenue 30d
    db
      .select({ total: sql<number>`coalesce(sum(${orders.amountPaise}), 0)` })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.paidAt, d30))),

    // Active subscriptions for MRR/ARR
    db
      .select({
        plan: subscriptions.plan,
        count: sql<number>`count(*)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.plan),

    // Active members by plan (from entitlements)
    db
      .select({
        plan: entitlements.plan,
        count: sql<number>`count(*)`,
      })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.kind, "membership"),
          isNull(entitlements.revokedAt),
          sql`(${entitlements.expiresAt} IS NULL OR ${entitlements.expiresAt} > now())`
        )
      )
      .groupBy(entitlements.plan),

    // Founding seats sold
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(eq(orders.plan, "founding"), eq(orders.status, "paid"))),

    // New subscribers 7d
    db
      .select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(gte(subscribers.createdAt, d7)),

    // Failed orders
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, "failed")),

    // Past due subscriptions
    db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "past_due")),

    // Content published this month
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentTable)
      .where(
        and(
          eq(contentTable.status, "published"),
          gte(contentTable.publishedAt, monthStart),
          isNull(contentTable.deletedAt)
        )
      ),

    // Top 5 Deep Dives by revenue
    db
      .select({
        slug: orders.contentSlug,
        revenue: sql<number>`sum(${orders.amountPaise})`,
      })
      .from(orders)
      .where(and(eq(orders.plan, "deep_dive"), eq(orders.status, "paid")))
      .groupBy(orders.contentSlug)
      .orderBy(desc(sql`sum(${orders.amountPaise})`))
      .limit(5),
  ]);

  // Fetch titles for top deep dives
  const topSlugs = topDDRows
    .map((r) => r.slug)
    .filter(Boolean) as string[];

  const titleRows =
    topSlugs.length > 0
      ? await db
          .select({ slug: contentTable.slug, title: contentTable.title })
          .from(contentTable)
          .where(sql`${contentTable.slug} = ANY(${topSlugs})`)
      : [];

  const titleMap = Object.fromEntries(titleRows.map((r) => [r.slug, r.title]));

  // Calculate MRR/ARR from active subscriptions
  const planAmountRows = await db
    .select({ id: plans.id, amountPaise: plans.amountPaise, interval: plans.interval })
    .from(plans);
  const planMap = Object.fromEntries(planAmountRows.map((p) => [p.id, p]));

  let mrr = 0;
  let arr = 0;
  for (const row of subRows) {
    const plan = planMap[row.plan];
    if (!plan) continue;
    const count = Number(row.count);
    if (plan.interval === "monthly") {
      mrr += plan.amountPaise * count;
      arr += plan.amountPaise * count * 12;
    } else if (plan.interval === "yearly") {
      arr += plan.amountPaise * count;
      mrr += Math.round((plan.amountPaise * count) / 12);
    }
  }

  const foundingSold = Number(foundingSoldRows[0]?.count ?? 0);

  return {
    revenueToday: Number(revTodayRows[0]?.total ?? 0),
    revenue7d: Number(rev7dRows[0]?.total ?? 0),
    revenue30d: Number(rev30dRows[0]?.total ?? 0),
    mrr,
    arr,
    activeByPlan: activeByPlanRows.map((r) => ({
      plan: r.plan ?? "unknown",
      count: Number(r.count),
    })),
    foundingSold,
    foundingRemaining: 200 - foundingSold,
    newSubscribers7d: Number(newSubRows[0]?.count ?? 0),
    failedOrders: Number(failedOrderRows[0]?.count ?? 0),
    pastDueSubs: Number(pastDueRows[0]?.count ?? 0),
    contentThisMonth: Number(contentMonthRows[0]?.count ?? 0),
    topDeepDives: topDDRows.map((r) => ({
      slug: r.slug ?? "",
      title: titleMap[r.slug ?? ""] ?? r.slug ?? "—",
      revenue: Number(r.revenue),
    })),
  };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className="bg-white border border-line rounded-lg px-5 py-4"
      style={alert ? { borderColor: "#f87171" } : undefined}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">
        {label}
      </p>
      <p
        className="text-[24px] font-semibold text-ink leading-none"
        style={alert ? { color: "#dc2626" } : undefined}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[12px] text-muted mt-1">{sub}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  await requireAdmin();

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">
        Database not configured — set DATABASE_URL to see dashboard stats.
      </div>
    );
  }

  const s = await loadStats();

  const PLAN_LABELS: Record<string, string> = {
    monthly: "Monthly",
    annual: "Annual",
    founding: "Founding",
    deep_dive: "Deep Dive",
  };

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-serif font-semibold text-ink">Dashboard</h1>
        <p className="text-[13px] text-muted mt-0.5">
          Live counts — refreshes on every page load.
        </p>
      </div>

      {/* Alerts */}
      {(s.failedOrders > 0 || s.pastDueSubs > 0) && (
        <div className="mb-6 flex flex-col gap-2">
          {s.failedOrders > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <span className="text-red-500 text-[15px]">⚠</span>
              <p className="text-[13px] text-red-800">
                <strong>{s.failedOrders}</strong> failed payment
                {s.failedOrders !== 1 ? "s" : ""} need attention.{" "}
                <Link href="/admin/payments/failed" className="underline">
                  View
                </Link>
              </p>
            </div>
          )}
          {s.pastDueSubs > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <span className="text-amber-500 text-[15px]">⚠</span>
              <p className="text-[13px] text-amber-800">
                <strong>{s.pastDueSubs}</strong> subscription
                {s.pastDueSubs !== 1 ? "s" : ""} in grace period (past due).{" "}
                <Link href="/admin/payments/failed" className="underline">
                  View
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Revenue */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          Revenue
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today" value={paiseToRupeeLabel(s.revenueToday)} />
          <StatCard label="Last 7 days" value={paiseToRupeeLabel(s.revenue7d)} />
          <StatCard label="Last 30 days" value={paiseToRupeeLabel(s.revenue30d)} />
          <StatCard
            label="MRR"
            value={paiseToRupeeLabel(s.mrr)}
            sub={`ARR ${paiseToRupeeLabel(s.arr)}`}
          />
        </div>
      </section>

      {/* Members */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          Members
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {s.activeByPlan.length === 0 ? (
            <div className="col-span-4 bg-white border border-line rounded-lg px-5 py-4 text-[13px] text-muted">
              No active members yet.
            </div>
          ) : (
            s.activeByPlan.map((row) => (
              <StatCard
                key={row.plan}
                label={PLAN_LABELS[row.plan] ?? row.plan}
                value={String(row.count)}
                sub="active members"
              />
            ))
          )}
          <StatCard
            label="Founding seats"
            value={`${s.foundingSold} / 200`}
            sub={`${s.foundingRemaining} remaining`}
            alert={s.foundingRemaining <= 20}
          />
        </div>
      </section>

      {/* Other */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          Newsletter & Content
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            label="New subscribers (7d)"
            value={String(s.newSubscribers7d)}
          />
          <StatCard
            label="Content this month"
            value={String(s.contentThisMonth)}
            sub="published"
          />
          {(s.failedOrders > 0 || s.pastDueSubs > 0) && (
            <StatCard
              label="Needs attention"
              value={String(s.failedOrders + s.pastDueSubs)}
              sub="failed / past-due"
              alert
            />
          )}
        </div>
      </section>

      {/* Top Deep Dives */}
      {s.topDeepDives.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
            Top Deep Dives by revenue
          </p>
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.topDeepDives.map((dd, i) => (
                  <tr
                    key={dd.slug}
                    className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-muted mr-2">{i + 1}.</span>
                      <Link
                        href={`/deep-dives/${dd.slug}`}
                        className="text-ink hover:text-accent transition-colors"
                        target="_blank"
                      >
                        {dd.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-ink">
                      {paiseToRupeeLabel(dd.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
