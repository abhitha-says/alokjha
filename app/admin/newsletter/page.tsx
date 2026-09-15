import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { subscribers } from "@/lib/db/schema/auth";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export const instant = false;

function startOf(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const status = sp.status as "confirmed" | "pending" | "unsubscribed" | "bounced" | undefined;

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">Database not configured.</div>
    );
  }

  const [
    totalRows,
    confirmedRows,
    pendingRows,
    unsubscribedRows,
    bouncedRows,
    new7dRows,
    new30dRows,
    sourceRows,
    listRows,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(subscribers),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.status, "confirmed")),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.status, "unsubscribed")),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.status, "bounced")),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(gte(subscribers.createdAt, startOf(7))),
    db.select({ count: sql<number>`count(*)` }).from(subscribers).where(gte(subscribers.createdAt, startOf(30))),
    // Source page attribution
    db
      .select({
        source: subscribers.sourcePage,
        count: sql<number>`count(*)`,
      })
      .from(subscribers)
      .where(eq(subscribers.status, "confirmed"))
      .groupBy(subscribers.sourcePage)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    // Subscriber list
    db
      .select({
        id: subscribers.id,
        email: subscribers.email,
        status: subscribers.status,
        sourcePage: subscribers.sourcePage,
        confirmedAt: subscribers.confirmedAt,
        createdAt: subscribers.createdAt,
        unsubscribedAt: subscribers.unsubscribedAt,
      })
      .from(subscribers)
      .where(status ? eq(subscribers.status, status) : undefined)
      .orderBy(desc(subscribers.createdAt))
      .limit(200),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const confirmed = Number(confirmedRows[0]?.count ?? 0);
  const pending = Number(pendingRows[0]?.count ?? 0);
  const unsubscribed = Number(unsubscribedRows[0]?.count ?? 0);
  const bounced = Number(bouncedRows[0]?.count ?? 0);
  const new7d = Number(new7dRows[0]?.count ?? 0);
  const new30d = Number(new30dRows[0]?.count ?? 0);

  const STATUS_BADGE: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    unsubscribed: "bg-gray-100 text-gray-500",
    bounced: "bg-red-100 text-red-700",
  };

  function filterUrl(s: string | undefined) {
    return s ? `/admin/newsletter?status=${s}` : "/admin/newsletter";
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-ink">Newsletter</h1>
          <p className="text-[13px] text-muted mt-0.5">{confirmed.toLocaleString()} confirmed subscribers</p>
        </div>
        <a
          href="/api/admin/newsletter/export"
          className="px-3.5 py-2 rounded-md text-[13px] font-medium border border-line text-muted hover:bg-cream transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Confirmed", value: confirmed, color: "text-green-700" },
          { label: "Pending", value: pending, color: "text-yellow-700" },
          { label: "Unsubscribed", value: unsubscribed, color: "text-gray-500" },
          { label: "Bounced", value: bounced, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-line rounded-lg px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">{s.label}</p>
            <p className={`text-[22px] font-semibold ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-7">
        <div className="bg-white border border-line rounded-lg px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">New (7d)</p>
          <p className="text-[22px] font-semibold text-ink">+{new7d.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-line rounded-lg px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">New (30d)</p>
          <p className="text-[22px] font-semibold text-ink">+{new30d.toLocaleString()}</p>
        </div>
      </div>

      {/* Source attribution */}
      {sourceRows.length > 0 && (
        <section className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">
            Top sources (confirmed subscribers)
          </p>
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Source page</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Subscribers</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-ink font-mono text-[12px]">{r.source ?? "(direct)"}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{Number(r.count).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Filters + list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Subscribers {status ? `· ${status}` : ""}
          </p>
          <div className="flex gap-1">
            {([undefined, "confirmed", "pending", "unsubscribed", "bounced"] as const).map((s) => (
              <Link
                key={s ?? "all"}
                href={filterUrl(s)}
                className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                  (status ?? undefined) === s
                    ? "bg-ink text-white"
                    : "bg-white border border-line text-muted hover:border-accent hover:text-ink"
                }`}
              >
                {s ?? "All"}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white border border-line rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-cream">
                <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em] hidden md:table-cell">Source</th>
                <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Date</th>
              </tr>
            </thead>
            <tbody>
              {listRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-[13px]">
                    No subscribers.
                  </td>
                </tr>
              ) : (
                listRows.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-2.5 text-ink font-medium text-[12px]">{s.email}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-medium ${STATUS_BADGE[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted text-[12px] hidden md:table-cell">{s.sourcePage ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted text-[12px]">
                      {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {listRows.length === 200 && (
          <p className="text-[12px] text-muted mt-2">Showing first 200. Use CSV export for the full list.</p>
        )}
      </section>
    </div>
  );
}
