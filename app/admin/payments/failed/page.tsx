import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { orders, subscriptions } from "@/lib/db/schema/commerce";
import { users } from "@/lib/db/schema/auth";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { paiseToRupeeLabel } from "@/lib/razorpay";

export const instant = false;

export default async function FailedPaymentsPage() {
  await requireAdmin();

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">
        Database not configured.
      </div>
    );
  }

  const now = new Date();

  const [failedOrders, pastDueSubs] = await Promise.all([
    // Failed one-time payments
    db
      .select({
        id: orders.id,
        plan: orders.plan,
        amountPaise: orders.amountPaise,
        contentSlug: orders.contentSlug,
        createdAt: orders.createdAt,
        email: users.email,
        name: users.name,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.status, "failed"))
      .orderBy(orders.createdAt)
      .limit(100),

    // Past-due subscriptions still in grace
    db
      .select({
        id: subscriptions.id,
        plan: subscriptions.plan,
        graceUntil: subscriptions.graceUntil,
        razorpaySubscriptionId: subscriptions.razorpaySubscriptionId,
        email: users.email,
        name: users.name,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.status, "past_due"),
          isNotNull(subscriptions.graceUntil)
        )
      )
      .orderBy(subscriptions.graceUntil)
      .limit(100),
  ]);

  const PLAN_LABELS: Record<string, string> = {
    deep_dive: "Deep Dive",
    monthly: "Monthly",
    annual: "Annual",
    founding: "Founding",
  };

  function graceDaysLeft(graceUntil: Date): number {
    return Math.max(0, Math.ceil((graceUntil.getTime() - now.getTime()) / 86_400_000));
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href="/admin/payments"
        className="text-[12px] text-muted hover:text-ink mb-5 inline-block"
      >
        ← All payments
      </Link>

      <h1 className="text-[22px] font-serif font-semibold text-ink mb-1">
        Failed payments &amp; dunning
      </h1>
      <p className="text-[13px] text-muted mb-7">
        Failed one-time payments and subscriptions currently in their payment grace period.
      </p>

      {/* Failed orders */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          Failed orders ({failedOrders.length})
        </p>
        {failedOrders.length === 0 ? (
          <div className="bg-white border border-line rounded-lg px-4 py-6 text-center text-muted text-[13px]">
            No failed payments.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Reader</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Plan</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Amount</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Detail</th>
                </tr>
              </thead>
              <tbody>
                {failedOrders.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-ink font-medium">{o.email ?? "—"}</p>
                      {o.name && <p className="text-muted text-[11px]">{o.name}</p>}
                    </td>
                    <td className="px-3 py-3 text-muted">{PLAN_LABELS[o.plan] ?? o.plan}</td>
                    <td className="px-3 py-3 text-ink">{paiseToRupeeLabel(o.amountPaise)}</td>
                    <td className="px-3 py-3 text-muted">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short",
                      })}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/payments/${o.id}`} className="text-accent text-[12px] hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Past-due subscriptions */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          Subscriptions in grace period ({pastDueSubs.length})
        </p>
        {pastDueSubs.length === 0 ? (
          <div className="bg-white border border-line rounded-lg px-4 py-6 text-center text-muted text-[13px]">
            No subscriptions currently in dunning.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Reader</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Plan</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Grace expires</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Days left</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Razorpay ID</th>
                </tr>
              </thead>
              <tbody>
                {pastDueSubs.map((s) => {
                  const daysLeft = s.graceUntil ? graceDaysLeft(s.graceUntil) : 0;
                  return (
                    <tr key={s.id} className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-ink font-medium">{s.email ?? "—"}</p>
                        {s.name && <p className="text-muted text-[11px]">{s.name}</p>}
                      </td>
                      <td className="px-3 py-3 text-muted">{PLAN_LABELS[s.plan] ?? s.plan}</td>
                      <td className="px-3 py-3 text-muted">
                        {s.graceUntil
                          ? new Date(s.graceUntil).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                            daysLeft <= 1
                              ? "bg-red-100 text-red-700"
                              : daysLeft <= 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {daysLeft}d
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-muted truncate max-w-[140px]">
                        {s.razorpaySubscriptionId}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
