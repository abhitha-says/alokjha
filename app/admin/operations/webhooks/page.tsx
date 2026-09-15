import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema/commerce";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import Link from "next/link";
import ReplayButton from "./ReplayButton";

export const instant = false;

const PAGE_SIZE = 50;

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const onlyUnprocessed = sp.unprocessed === "1";
  const onlyErrors = sp.errors === "1";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  if (!DATABASE_CONFIGURED) {
    return <div className="px-8 py-8 text-muted text-[13px]">Database not configured.</div>;
  }

  const conditions = [
    onlyUnprocessed ? isNull(webhookEvents.processedAt) : undefined,
    onlyErrors ? sql`${webhookEvents.error} IS NOT NULL` : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(webhookEvents)
      .where(whereClause)
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)` }).from(webhookEvents).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      unprocessed: onlyUnprocessed ? "1" : undefined,
      errors: onlyErrors ? "1" : undefined,
      page: "1",
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/operations/webhooks?${params.toString()}`;
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-ink">Webhook events</h1>
          <p className="text-[13px] text-muted mt-0.5">{total.toLocaleString()} events stored</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        <Link
          href={filterUrl({ unprocessed: undefined, errors: undefined })}
          className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
            !onlyUnprocessed && !onlyErrors ? "bg-ink text-white" : "bg-white border border-line text-muted hover:border-accent"
          }`}
        >
          All
        </Link>
        <Link
          href={filterUrl({ unprocessed: onlyUnprocessed ? undefined : "1", errors: undefined })}
          className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
            onlyUnprocessed ? "bg-ink text-white" : "bg-white border border-line text-muted hover:border-accent"
          }`}
        >
          Unprocessed
        </Link>
        <Link
          href={filterUrl({ errors: onlyErrors ? undefined : "1", unprocessed: undefined })}
          className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
            onlyErrors ? "bg-red-600 text-white" : "bg-white border border-line text-muted hover:border-red-200 hover:text-red-700"
          }`}
        >
          Errors
        </Link>
      </div>

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-cream">
              <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Type</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Event ID</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Sig</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Received</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Processed</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Error</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Replay</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted text-[13px]">No events.</td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className={`border-b border-line last:border-0 hover:bg-cream/40 transition-colors ${w.error ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <code className="text-[11px] bg-cream px-1.5 py-0.5 rounded">{w.type}</code>
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted truncate max-w-[140px]">
                    {w.providerEventId}
                  </td>
                  <td className="px-3 py-3">
                    {w.signatureValid ? (
                      <span className="text-green-600 text-[13px]">✓</span>
                    ) : (
                      <span className="text-red-600 text-[13px]">✗</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted text-[12px]">
                    {new Date(w.receivedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-3 text-[12px]">
                    {w.processedAt ? (
                      <span className="text-green-700">
                        {new Date(w.processedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className="text-amber-600">Pending</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-red-700 text-[11px] max-w-[160px] truncate">
                    {w.error ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {w.error && <ReplayButton eventId={w.id} />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12px] text-muted">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={filterUrl({ page: String(page - 1) })} className="px-3 py-1.5 border border-line rounded text-[12px] text-ink hover:bg-cream transition-colors">
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={filterUrl({ page: String(page + 1) })} className="px-3 py-1.5 border border-line rounded text-[12px] text-ink hover:bg-cream transition-colors">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
