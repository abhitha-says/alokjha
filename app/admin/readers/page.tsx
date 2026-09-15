import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { users, subscribers } from "@/lib/db/schema/auth";
import { orders, entitlements } from "@/lib/db/schema/commerce";
import { eq, and, ilike, isNull, desc, sql } from "drizzle-orm";

export const instant = false;

const PAGE_SIZE = 25;

export default async function ReadersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { q, page: "1", ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/readers?${params.toString()}`;
  }

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">
        Database not configured.
      </div>
    );
  }

  const whereClause = and(
    isNull(users.deletedAt),
    q ? ilike(users.email, `%${q}%`) : undefined
  );

  // Subquery: lifetime value per user
  const ltvSq = db
    .select({
      userId: orders.userId,
      ltv: sql<number>`coalesce(sum(${orders.amountPaise}), 0)`.as("ltv"),
    })
    .from(orders)
    .where(eq(orders.status, "paid"))
    .groupBy(orders.userId)
    .as("ltv_sq");

  // Subquery: active plan per user (from entitlements)
  const planSq = db
    .select({
      userId: entitlements.userId,
      plan: sql<string>`${entitlements.plan}`.as("plan"),
    })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.kind, "membership"),
        isNull(entitlements.revokedAt),
        sql`(${entitlements.expiresAt} IS NULL OR ${entitlements.expiresAt} > now())`
      )
    )
    .as("plan_sq");

  // Subquery: newsletter status per user
  const subSq = db
    .select({
      userId: subscribers.userId,
      status: sql<string>`${subscribers.status}`.as("sub_status"),
    })
    .from(subscribers)
    .as("sub_sq");

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,
        ltv: ltvSq.ltv,
        plan: planSq.plan,
        newsletterStatus: subSq.status,
      })
      .from(users)
      .leftJoin(ltvSq, eq(users.id, ltvSq.userId))
      .leftJoin(planSq, eq(users.id, planSq.userId))
      .leftJoin(subSq, eq(users.id, subSq.userId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const PLAN_LABELS: Record<string, string> = {
    monthly: "Monthly",
    annual: "Annual",
    founding: "Founding",
    deep_dive: "Deep Dive",
  };

  const SUB_BADGE: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    unsubscribed: "bg-gray-100 text-gray-500",
    bounced: "bg-red-100 text-red-700",
  };

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-ink">Readers</h1>
          <p className="text-[13px] text-muted mt-0.5">{total.toLocaleString()} accounts</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <form method="GET" action="/admin/readers" className="flex">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by email…"
            className="border border-line rounded-l-md px-3 py-1.5 text-[13px] bg-white text-ink placeholder-muted focus:outline-none focus:border-accent w-64"
          />
          <button
            type="submit"
            className="border border-l-0 border-line rounded-r-md px-3 py-1.5 text-[13px] bg-cream hover:bg-line transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-cream">
              <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Email</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Plan</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">LTV</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em] hidden md:table-cell">Signed up</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em] hidden lg:table-cell">Last seen</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Newsletter</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted text-[13px]">
                  No readers found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-ink font-medium truncate max-w-[200px]">{r.email}</p>
                    {r.name && <p className="text-muted text-[11px]">{r.name}</p>}
                    {(r.role === "admin" || r.role === "editor") && (
                      <span className="text-[10px] bg-ink text-white px-1.5 py-0.5 rounded">
                        {r.role}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.plan ? (
                      <span className="text-ink text-[12px]">{PLAN_LABELS[r.plan] ?? r.plan}</span>
                    ) : (
                      <span className="text-muted text-[12px]">Free</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink font-medium">
                    {r.ltv
                      ? `₹${(Number(r.ltv) / 100).toLocaleString("en-IN")}`
                      : <span className="text-muted font-normal">₹0</span>}
                  </td>
                  <td className="px-3 py-3 text-muted hidden md:table-cell">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-3 py-3 text-muted hidden lg:table-cell">
                    {r.lastSeenAt
                      ? new Date(r.lastSeenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {r.newsletterStatus ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-medium ${SUB_BADGE[r.newsletterStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {r.newsletterStatus}
                      </span>
                    ) : (
                      <span className="text-muted text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/readers/${r.id}`} className="text-accent text-[12px] hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12px] text-muted">
            Page {page} of {totalPages} · {total.toLocaleString()} readers
          </p>
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
