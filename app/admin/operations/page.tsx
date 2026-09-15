import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { adminAuditLog, users } from "@/lib/db/schema/auth";
import { eq, and, desc, sql, ilike, gte } from "drizzle-orm";
import Link from "next/link";

export const instant = false;

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const action = sp.action?.trim() ?? "";
  const target = sp.target?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { action, target, page: "1", ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/operations?${params.toString()}`;
  }

  if (!DATABASE_CONFIGURED) {
    return <div className="px-8 py-8 text-muted text-[13px]">Database not configured.</div>;
  }

  const conditions = [
    action ? ilike(adminAuditLog.action, `%${action}%`) : undefined,
    target ? ilike(adminAuditLog.targetId, `%${target}%`) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: adminAuditLog.id,
        action: adminAuditLog.action,
        targetType: adminAuditLog.targetType,
        targetId: adminAuditLog.targetId,
        reason: adminAuditLog.reason,
        ip: adminAuditLog.ip,
        createdAt: adminAuditLog.createdAt,
        actorEmail: users.email,
        before: adminAuditLog.before,
        after: adminAuditLog.after,
      })
      .from(adminAuditLog)
      .leftJoin(users, eq(adminAuditLog.actorId, users.id))
      .where(whereClause)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)` }).from(adminAuditLog).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-serif font-semibold text-ink">Audit log</h1>
        <p className="text-[13px] text-muted mt-0.5">{total.toLocaleString()} entries — append-only</p>
      </div>

      {/* Filters */}
      <form method="GET" action="/admin/operations" className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          name="action"
          defaultValue={action}
          placeholder="Filter by action…"
          className="border border-line rounded-md px-3 py-1.5 text-[13px] bg-white text-ink placeholder-muted focus:outline-none focus:border-accent w-48"
        />
        <input
          type="text"
          name="target"
          defaultValue={target}
          placeholder="Filter by target ID…"
          className="border border-line rounded-md px-3 py-1.5 text-[13px] bg-white text-ink placeholder-muted focus:outline-none focus:border-accent w-64"
        />
        <button type="submit" className="px-3.5 py-1.5 border border-line rounded-md text-[13px] bg-cream hover:bg-line transition-colors">
          Filter
        </button>
        {(action || target) && (
          <Link href="/admin/operations" className="px-3.5 py-1.5 text-[13px] text-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-cream">
              <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Action</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Actor</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Target</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Reason</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">IP</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted text-[13px]">
                  No audit entries.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-[12px] bg-cream px-1.5 py-0.5 rounded">{r.action}</code>
                  </td>
                  <td className="px-3 py-3 text-muted text-[12px]">{r.actorEmail ?? "system"}</td>
                  <td className="px-3 py-3">
                    {r.targetType && (
                      <p className="text-[11px] text-muted">{r.targetType}</p>
                    )}
                    {r.targetId && (
                      <p className="font-mono text-[11px] text-muted/70 truncate max-w-[120px]">{r.targetId}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted text-[12px] max-w-[180px] truncate">{r.reason ?? "—"}</td>
                  <td className="px-3 py-3 text-muted text-[11px] font-mono">{r.ip ?? "—"}</td>
                  <td className="px-3 py-3 text-muted text-[12px]">
                    {new Date(r.createdAt).toLocaleString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
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
