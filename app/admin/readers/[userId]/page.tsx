import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { users, subscribers, adminAuditLog } from "@/lib/db/schema/auth";
import { orders, entitlements } from "@/lib/db/schema/commerce";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { paiseToRupeeLabel } from "@/lib/razorpay";
import GrantEntitlementForm from "./GrantEntitlementForm";
import RevokeEntitlementButton from "./RevokeEntitlementButton";
import DeleteAccountButton from "./DeleteAccountButton";

export const instant = false;

export default async function ReaderDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();

  const { userId } = await params;

  if (!DATABASE_CONFIGURED) {
    return <div className="px-8 py-8 text-muted text-[13px]">Database not configured.</div>;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) notFound();

  const [userOrders, userEntitlements, userSubscriber] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(50),

    db
      .select()
      .from(entitlements)
      .where(eq(entitlements.userId, userId))
      .orderBy(desc(entitlements.grantedAt))
      .limit(50),

    db
      .select()
      .from(subscribers)
      .where(eq(subscribers.userId, userId))
      .limit(1),
  ]);

  const subscriber = userSubscriber[0] ?? null;

  const totalPaidPaise = userOrders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.amountPaise, 0);

  const PLAN_LABELS: Record<string, string> = {
    deep_dive: "Deep Dive",
    monthly: "Monthly",
    annual: "Annual",
    founding: "Founding",
  };

  const STATUS_COLORS: Record<string, string> = {
    created: "bg-gray-100 text-gray-600",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-amber-100 text-amber-800",
  };

  const isDeleted = Boolean(user.deletedAt);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link href="/admin/readers" className="text-[12px] text-muted hover:text-ink mb-5 inline-block">
        ← All readers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-ink">
            {isDeleted ? "[Deleted]" : (user.name ?? user.email)}
          </h1>
          <p className="text-[13px] text-muted mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cream border border-line text-muted">
            {user.role}
          </span>
          {isDeleted && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">
              Deleted
            </span>
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <div className="bg-white border border-line rounded-lg px-4 py-3">
          <p className="text-[11px] text-muted uppercase tracking-[0.1em] font-semibold mb-1">Lifetime value</p>
          <p className="text-[20px] font-semibold text-ink">{paiseToRupeeLabel(totalPaidPaise)}</p>
        </div>
        <div className="bg-white border border-line rounded-lg px-4 py-3">
          <p className="text-[11px] text-muted uppercase tracking-[0.1em] font-semibold mb-1">Signed up</p>
          <p className="text-[14px] text-ink">{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <div className="bg-white border border-line rounded-lg px-4 py-3">
          <p className="text-[11px] text-muted uppercase tracking-[0.1em] font-semibold mb-1">Last seen</p>
          <p className="text-[14px] text-ink">{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Never"}</p>
        </div>
      </div>

      {/* Newsletter */}
      {subscriber && (
        <div className="bg-white border border-line rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <p className="text-[12px] text-muted font-semibold uppercase tracking-[0.1em]">Newsletter:</p>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            subscriber.status === "confirmed" ? "bg-green-100 text-green-700"
            : subscriber.status === "pending" ? "bg-yellow-100 text-yellow-700"
            : subscriber.status === "bounced" ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-500"
          }`}>
            {subscriber.status}
          </span>
          {subscriber.sourcePage && (
            <p className="text-[12px] text-muted">via {subscriber.sourcePage}</p>
          )}
        </div>
      )}

      {/* Entitlements */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Entitlements ({userEntitlements.length})
          </p>
        </div>
        {userEntitlements.length === 0 ? (
          <div className="bg-white border border-line rounded-lg px-4 py-5 text-center text-muted text-[13px]">
            No entitlements.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-lg overflow-hidden mb-3">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Kind</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Plan / Slug</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Granted</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Expires</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Revoked</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {userEntitlements.map((e) => (
                  <tr key={e.id} className={`border-b border-line last:border-0 ${e.revokedAt ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2.5 text-ink">{e.kind}</td>
                    <td className="px-3 py-2.5 text-muted text-[12px]">
                      {e.plan ? PLAN_LABELS[e.plan] ?? e.plan : ""}
                      {e.contentSlug && <span className="font-mono ml-1">{e.contentSlug}</span>}
                      {e.note && <p className="text-[11px] text-muted/70 italic">{e.note}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-muted text-[12px]">{new Date(e.grantedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    <td className="px-3 py-2.5 text-muted text-[12px]">{e.expiresAt ? new Date(e.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Permanent"}</td>
                    <td className="px-3 py-2.5 text-[12px]">{e.revokedAt ? <span className="text-red-600">{new Date(e.revokedAt).toLocaleDateString("en-IN")}</span> : "—"}</td>
                    <td className="px-3 py-2.5">
                      {!e.revokedAt && (
                        <RevokeEntitlementButton entitlementId={e.id} userId={userId} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Manual grant form */}
        {!isDeleted && <GrantEntitlementForm userId={userId} />}
      </section>

      {/* Payment history */}
      <section className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">
          Payment history ({userOrders.length})
        </p>
        {userOrders.length === 0 ? (
          <div className="bg-white border border-line rounded-lg px-4 py-5 text-center text-muted text-[13px]">
            No payments.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Plan</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Amount</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Date</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {userOrders.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-ink">
                      {PLAN_LABELS[o.plan] ?? o.plan}
                      {o.contentSlug && <span className="ml-1 text-muted font-mono text-[11px]">{o.contentSlug}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink">{paiseToRupeeLabel(o.amountPaise)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-medium ${STATUS_COLORS[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/payments/${o.id}`} className="text-accent text-[12px] hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* GDPR / DPDP */}
      {!isDeleted && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">
            GDPR / DPDP
          </p>
          <div className="flex gap-3">
            <a
              href={`/api/admin/readers/export?userId=${userId}`}
              className="px-4 py-2 rounded-md text-[13px] font-medium border border-line text-muted hover:bg-cream transition-colors"
            >
              Export data
            </a>
            <DeleteAccountButton userId={userId} />
          </div>
        </section>
      )}
    </div>
  );
}
