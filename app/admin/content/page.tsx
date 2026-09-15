import Link from "next/link";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { content as contentTable } from "@/lib/db/schema/content";
import { requireEditor } from "@/lib/admin-auth";
import { and, eq, isNull, ilike, desc, sql } from "drizzle-orm";
import type { Content } from "@/lib/db/schema/content";
import DeleteContentButton from "./DeleteContentButton";

// Auth + DB reads on every request — must not be prerendered.
export const instant = false;

const PAGE_SIZE = 20;

const KIND_LABELS: Record<Content["kind"], string> = {
  signal: "Signal",
  deep_dive: "Deep Dive",
  report: "Report",
};

const STATUS_COLORS: Record<Content["status"], string> = {
  draft: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-500",
};

export default async function AdminContentList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const actor = await requireEditor();

  const sp = await searchParams;
  const kind = (sp.kind as Content["kind"] | undefined) ?? undefined;
  const status = (sp.status as Content["status"] | undefined) ?? undefined;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const whereClause = and(
    isNull(contentTable.deletedAt),
    kind ? eq(contentTable.kind, kind) : undefined,
    status ? eq(contentTable.status, status) : undefined,
    q ? ilike(contentTable.title, `%${q}%`) : undefined
  );

  const [rows, totalRows] = DATABASE_CONFIGURED
    ? await Promise.all([
        db
          .select({
            id: contentTable.id,
            kind: contentTable.kind,
            slug: contentTable.slug,
            title: contentTable.title,
            status: contentTable.status,
            category: contentTable.category,
            publishedAt: contentTable.publishedAt,
            scheduledFor: contentTable.scheduledFor,
            wordCount: contentTable.wordCount,
            isFreeEdition: contentTable.isFreeEdition,
            updatedAt: contentTable.updatedAt,
          })
          .from(contentTable)
          .where(whereClause)
          .orderBy(desc(contentTable.updatedAt))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE),
        db.select({ count: sql<number>`count(*)` }).from(contentTable).where(whereClause),
      ])
    : [[], [{ count: 0 }]];

  const total = Number(totalRows[0]?.count ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { kind, status, q, page: "1", ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/content?${params.toString()}`;
  }

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-ink">Content</h1>
          <p className="text-[13px] text-muted mt-0.5">
            {total} piece{total !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/content/new?kind=signal"
            className="px-3.5 py-2 rounded-md text-[13px] font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            + Signal
          </Link>
          <Link
            href="/admin/content/new?kind=deep_dive"
            className="px-3.5 py-2 rounded-md text-[13px] font-medium bg-ink text-white hover:bg-ink/80 transition-colors"
          >
            + Deep Dive
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <form method="GET" action="/admin/content" className="flex">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search title…"
            className="border border-line rounded-l-md px-3 py-1.5 text-[13px] bg-white text-ink placeholder-muted focus:outline-none focus:border-accent w-52"
          />
          <button
            type="submit"
            className="border border-l-0 border-line rounded-r-md px-3 py-1.5 text-[13px] bg-cream hover:bg-line transition-colors"
          >
            Go
          </button>
        </form>

        {/* Kind filter */}
        <div className="flex gap-1">
          {(["", "signal", "deep_dive", "report"] as const).map((k) => (
            <Link
              key={k}
              href={filterUrl({ kind: k || undefined })}
              className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                (kind ?? "") === k
                  ? "bg-ink text-white"
                  : "bg-white border border-line text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {k === "" ? "All" : KIND_LABELS[k as Content["kind"]]}
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {(["", "draft", "scheduled", "published", "archived"] as const).map((s) => (
            <Link
              key={s}
              href={filterUrl({ status: s || undefined })}
              className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                (status ?? "") === s
                  ? "bg-ink text-white"
                  : "bg-white border border-line text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {s === "" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-cream">
              <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Title
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Kind
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Status
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                Category
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em] hidden sm:table-cell">
                Words
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em] hidden md:table-cell">
                Updated
              </th>
              {actor.role === "admin" && (
                <th className="px-3 py-2.5 text-right font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={actor.role === "admin" ? 7 : 6} className="px-4 py-10 text-center text-muted text-[13px]">
                  No content found.
                  {!DATABASE_CONFIGURED && (
                    <span className="block mt-1 text-[11px]">
                      Database not configured — set DATABASE_URL to see content.
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/content/${row.id}`}
                      className="font-medium text-ink hover:text-accent transition-colors"
                    >
                      {row.title}
                    </Link>
                    {row.isFreeEdition && (
                      <span className="ml-2 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                        Free
                      </span>
                    )}
                    <p className="text-muted text-[11px] mt-0.5 font-mono">{row.slug}</p>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {KIND_LABELS[row.kind]}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-medium ${
                        STATUS_COLORS[row.status]
                      }`}
                    >
                      {row.status}
                    </span>
                    {row.status === "scheduled" && row.scheduledFor && (
                      <p className="text-[10px] text-muted mt-0.5">
                        {new Date(row.scheduledFor).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">{row.category}</td>
                  <td className="px-3 py-3 text-muted hidden sm:table-cell">
                    {row.wordCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-muted hidden md:table-cell">
                    {new Date(row.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  {actor.role === "admin" && (
                    <td className="px-3 py-3 text-right">
                      <DeleteContentButton id={row.id} title={row.title} />
                    </td>
                  )}
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
            Page {page} of {totalPages} · {total} results
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
