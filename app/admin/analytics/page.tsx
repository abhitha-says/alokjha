import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { orders, entitlements } from "@/lib/db/schema/commerce";
import { content as contentTable } from "@/lib/db/schema/content";
import { eq, and, desc, sql } from "drizzle-orm";
import { paiseToRupeeLabel } from "@/lib/razorpay";

export const instant = false;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu"
  ? "https://eu.posthog.com"
  : "https://us.posthog.com";
const POSTHOG_PERSONAL_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

export default async function AnalyticsPage() {
  await requireAdmin();

  // Native DB: revenue per content piece (Deep Dives only)
  const revenuePerSlug = DATABASE_CONFIGURED
    ? await db
        .select({
          slug: orders.contentSlug,
          orders: sql<number>`count(*)`,
          revenue: sql<number>`sum(${orders.amountPaise})`,
        })
        .from(orders)
        .where(and(eq(orders.plan, "deep_dive"), eq(orders.status, "paid")))
        .groupBy(orders.contentSlug)
        .orderBy(desc(sql`sum(${orders.amountPaise})`))
        .limit(20)
    : [];

  // Fetch titles for those slugs
  const slugs = revenuePerSlug.map((r) => r.slug).filter(Boolean) as string[];
  const titleMap: Record<string, string> = {};
  if (slugs.length > 0 && DATABASE_CONFIGURED) {
    const rows = await db
      .select({ slug: contentTable.slug, title: contentTable.title })
      .from(contentTable)
      .where(sql`${contentTable.slug} = ANY(${slugs})`);
    for (const r of rows) titleMap[r.slug] = r.title;
  }

  const hasPostHog = Boolean(POSTHOG_KEY && POSTHOG_PERSONAL_KEY);

  // PostHog shared dashboard embed URLs require the personal key as a token
  // and the project API key. We construct a URL pointing at the PostHog UI.
  // Real embedded dashboards use the PostHog embed API — for now we link
  // directly to the PostHog project since iframe embeds require a shared
  // dashboard URL generated in the PostHog UI.
  const posthogProjectUrl = `${POSTHOG_HOST}/project/default`;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-serif font-semibold text-ink">Analytics</h1>
        <p className="text-[13px] text-muted mt-0.5">
          Native revenue data from your database + PostHog product analytics.
        </p>
      </div>

      {/* PostHog section */}
      <section className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          PostHog — product analytics
        </p>

        {!hasPostHog ? (
          <div className="bg-cream border border-line rounded-lg px-5 py-6">
            <p className="text-[13px] text-muted mb-2">
              PostHog is not fully configured for the admin panel.
            </p>
            <p className="text-[12px] text-muted">
              Set <code className="bg-white px-1.5 py-0.5 rounded border border-line">POSTHOG_PERSONAL_API_KEY</code> in your environment to enable embedded dashboards.
              This key is different from the public ingestion key — create it in PostHog → Settings → Personal API Keys with <em>read</em> scope.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-muted">
              Open your PostHog dashboards directly — shared embeds are generated from the PostHog UI under each dashboard's Share menu.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Acquisition funnel", path: "/insights" },
                { label: "Reader → payer funnel", path: "/funnels" },
                { label: "Content performance", path: "/insights" },
                { label: "Retention", path: "/retention" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={`${posthogProjectUrl}${item.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white border border-line rounded-lg px-4 py-3 hover:border-accent transition-colors group"
                >
                  <span className="text-[13px] text-ink">{item.label}</span>
                  <span className="text-muted text-[12px] group-hover:text-accent transition-colors">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Revenue per Deep Dive */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          Revenue per Deep Dive (all-time)
        </p>

        {revenuePerSlug.length === 0 ? (
          <div className="bg-white border border-line rounded-lg px-5 py-8 text-center text-muted text-[13px]">
            No Deep Dive purchases yet.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Deep Dive</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Orders</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Revenue</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Avg per order</th>
                </tr>
              </thead>
              <tbody>
                {revenuePerSlug.map((r, i) => {
                  const orderCount = Number(r.orders);
                  const revPaise = Number(r.revenue);
                  const avgPaise = orderCount > 0 ? Math.round(revPaise / orderCount) : 0;
                  return (
                    <tr key={r.slug ?? i} className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-ink">{titleMap[r.slug ?? ""] ?? r.slug ?? "—"}</p>
                        <p className="text-muted font-mono text-[11px]">{r.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-muted">{orderCount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-semibold text-ink">{paiseToRupeeLabel(revPaise)}</td>
                      <td className="px-3 py-3 text-right text-muted">{paiseToRupeeLabel(avgPaise)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[12px] text-muted mt-3">
          Paywall conversion rate (paywall hits ÷ purchases) is available in PostHog by joining <code>paywall_hit</code> against <code>checkout_succeeded</code> per slug.
        </p>
      </section>
    </div>
  );
}
