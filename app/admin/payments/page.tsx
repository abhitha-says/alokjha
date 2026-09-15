import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { orders } from "@/lib/db/schema/commerce";
import { users } from "@/lib/db/schema/auth";
import { eq, and, gte, lte, ilike, desc, sql } from "drizzle-orm";
import { paiseToRupeeLabel } from "@/lib/razorpay";
import type { Order } from "@/lib/db/schema/commerce";

export const instant = false;

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<Order["status"], string> = {
  created: "bg-gray-100 text-gray-600",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-amber-100 text-amber-800",
};

const PLAN_LABELS: Record<string, string> = {
  deep_dive: "Deep Dive",
  monthly: "Monthly",
  annual: "Annual",
  founding: "Founding",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const status = sp.status as Order["status"] | undefined;
  const plan = sp.plan as string | undefined;
  const q = sp.q?.trim() ?? "";
  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to + "T23:59:59Z") : undefined;

  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { status, plan, q, page: "1", from: sp.from, to: sp.to, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/payments?${params.toString()}`;
  }

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">
        Database not configured.
      </div>
    );
  }

  // Build WHERE conditions
  const conditions = [
    status ? eq(orders.status, status) : undefined,
    plan ? eq(orders.plan, plan as Order["plan"]) : undefined,
    from ? gte(orders.createdAt, from) : undefined,
    to ? lte(orders.createdAt, to) : undefined,
  ].filter(Boolean);

  // When searching by email we need a join; do it separately
  let emailFilter: string[] = [];
  if (q) {
    const matchedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(ilike(users.email, `%${q}%`))
      .limit(100);
    emailFilter = matchedUsers.map((u) => u.id);
    if (emailFilter.length === 0) {
      // No matching users → no results
      return renderEmpty(filterUrl, status, plan, q, sp.from, sp.to);
    }
    conditions.push(sql`${orders.userId} = ANY(ARRAY[${sql.join(emailFilter.map(id => sql`${id}::uuid`), sql`, `)}])`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: orders.id,
        userId: orders.userId,
        plan: orders.plan,
        contentSlug: orders.contentSlug,
        amountPaise: orders.amountPaise,
        status: orders.status,
        razorpayOrderId: orders.razorpayOrderId,
        razorpayPaymentId: orders.razorpayPaymentId,
        foundingSeatNo: orders.foundingSeatNo,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        email: users.email,
        name: users.name,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-ink">Payments</h1>
          <p className="text-[13px] text-muted mt-0.5">{total.toLocaleString()} transactions</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/payments/failed"
            className="px-3.5 py-2 rounded-md text-[13px] font-medium border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
          >
            Failed / dunning
          </Link>
          <a
            href={`/api/admin/payments/export?${new URLSearchParams({ status: status ?? "", plan: plan ?? "", q, from: sp.from ?? "", to: sp.to ?? "" }).toString()}`}
            className="px-3.5 py-2 rounded-md text-[13px] font-medium border border-line text-muted hover:bg-cream transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <form method="GET" action="/admin/payments" className="flex">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search email…"
            className="border border-line rounded-l-md px-3 py-1.5 text-[13px] bg-white text-ink placeholder-muted focus:outline-none focus:border-accent w-52"
          />
          <button
            type="submit"
            className="border border-l-0 border-line rounded-r-md px-3 py-1.5 text-[13px] bg-cream hover:bg-line transition-colors"
          >
            Go
          </button>
        </form>

        {/* Status */}
        <div className="flex gap-1">
          {(["", "created", "paid", "failed", "refunded"] as const).map((s) => (
            <Link
              key={s}
              href={filterUrl({ status: s || undefined })}
              className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                (status ?? "") === s
                  ? "bg-ink text-white"
                  : "bg-white border border-line text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>

        {/* Plan */}
        <div className="flex gap-1">
          {(["", "deep_dive", "monthly", "annual", "founding"] as const).map((p) => (
            <Link
              key={p}
              href={filterUrl({ plan: p || undefined })}
              className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                (plan ?? "") === p
                  ? "bg-ink text-white"
                  : "bg-white border border-line text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {p === "" ? "All plans" : PLAN_LABELS[p] ?? p}
            </Link>
          ))}
        </div>

        {/* Date range */}
        <form method="GET" action="/admin/payments" className="flex items-center gap-1.5">
          {status && <input type="hidden" name="status" value={status} />}
          {plan && <input type="hidden" name="plan" value={plan} />}
          {q && <input type="hidden" name="q" value={q} />}
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="border border-line rounded-md px-2 py-1.5 text-[12px] bg-white text-ink focus:outline-none focus:border-accent"
          />
          <span className="text-muted text-[12px]">to</span>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="border border-line rounded-md px-2 py-1.5 text-[12px] bg-white text-ink focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 border border-line rounded-md text-[12px] bg-cream hover:bg-line transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-cream">
              <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Reader
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Plan
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Amount
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Status
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em] hidden md:table-cell">
                Date
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Detail
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted text-[13px]">
                  No transactions found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-ink font-medium truncate max-w-[180px]">
                      {row.email ?? "—"}
                    </p>
                    {row.name && (
                      <p className="text-muted text-[11px]">{row.name}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {PLAN_LABELS[row.plan] ?? row.plan}
                    {row.contentSlug && (
                      <p className="text-[11px] font-mono text-muted/70 truncate max-w-[120px]">
                        {row.contentSlug}
                      </p>
                    )}
                    {row.foundingSeatNo && (
                      <p className="text-[11px] text-muted">Seat #{row.foundingSeatNo}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium text-ink">
                    {paiseToRupeeLabel(row.amountPaise)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-medium ${
                        STATUS_COLORS[row.status]
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted hidden md:table-cell">
                    {new Date(row.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/payments/${row.id}`}
                      className="text-accent text-[12px] hover:underline"
                    >
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
            Page {page} of {totalPages} · {total.toLocaleString()} results
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={filterUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 border border-line rounded text-[12px] text-ink hover:bg-cream transition-colors"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={filterUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 border border-line rounded text-[12px] text-ink hover:bg-cream transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function renderEmpty(
  filterUrl: (o: Record<string, string | undefined>) => string,
  status: string | undefined,
  plan: string | undefined,
  q: string,
  from: string | undefined,
  to: string | undefined
) {
  return (
    <div className="px-8 py-8">
      <h1 className="text-[22px] font-serif font-semibold text-ink mb-6">Payments</h1>
      <div className="bg-white border border-line rounded-lg px-4 py-10 text-center text-muted text-[13px]">
        No transactions match your search.
      </div>
    </div>
  );
}
