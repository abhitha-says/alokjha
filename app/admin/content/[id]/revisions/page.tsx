import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { content as contentTable, contentRevisions } from "@/lib/db/schema/content";
import { users } from "@/lib/db/schema/auth";
import { requireEditor } from "@/lib/admin-auth";
import { RestoreButton } from "./RestoreButton";

export const instant = false;

export default async function RevisionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  await requireEditor();

  const { id } = await params;
  const sp = await searchParams;
  const diffVersion = sp.diff ? parseInt(sp.diff, 10) : null;

  if (!DATABASE_CONFIGURED) {
    return <div className="p-8 text-muted text-[13px]">Database not configured.</div>;
  }

  const [row] = await db
    .select({ id: contentTable.id, title: contentTable.title, slug: contentTable.slug })
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);

  if (!row) notFound();

  const revisions = await db
    .select({
      id: contentRevisions.id,
      version: contentRevisions.version,
      title: contentRevisions.title,
      bodyMd: contentRevisions.bodyMd,
      changeNote: contentRevisions.changeNote,
      createdAt: contentRevisions.createdAt,
      editorId: contentRevisions.editorId,
    })
    .from(contentRevisions)
    .where(eq(contentRevisions.contentId, id))
    .orderBy(desc(contentRevisions.version));

  // Find the diff target revision if requested.
  const diffRevision = diffVersion
    ? revisions.find((r) => r.version === diffVersion)
    : null;

  // Current (latest) revision for comparison.
  const currentRevision = revisions[0];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/admin/content/${id}`}
          className="text-muted text-[13px] hover:text-ink"
        >
          ← {row.title}
        </Link>
        <span className="text-line">/</span>
        <h1 className="text-[18px] font-serif font-semibold text-ink">
          Revision history
        </h1>
      </div>

      {/* Diff view */}
      {diffRevision && currentRevision && (
        <div className="mb-8 bg-white border border-line rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-cream flex items-center justify-between">
            <p className="text-[12px] font-semibold text-ink">
              Comparing revision {diffRevision.version} vs current (revision{" "}
              {currentRevision.version})
            </p>
            <Link
              href={`/admin/content/${id}/revisions`}
              className="text-[11px] text-muted hover:text-ink"
            >
              Close diff
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line">
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                Revision {diffRevision.version} (
                {new Date(diffRevision.createdAt).toLocaleString("en-IN")})
              </p>
              <pre className="text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono overflow-x-auto">
                {diffRevision.bodyMd}
              </pre>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                Current (revision {currentRevision.version})
              </p>
              <pre className="text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono overflow-x-auto">
                {currentRevision.bodyMd}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Revision list */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-cream">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Version
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Note
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Saved
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {revisions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted text-[13px]">
                  No revisions yet. Revisions are saved whenever you save the piece.
                </td>
              </tr>
            ) : (
              revisions.map((rev, i) => (
                <tr
                  key={rev.id}
                  className="border-b border-line last:border-0 hover:bg-cream/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] font-semibold text-ink">
                      v{rev.version}
                    </span>
                    {i === 0 && (
                      <span className="ml-2 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                        current
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {rev.changeNote ?? (
                      <span className="italic text-muted/60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {new Date(rev.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {i > 0 && (
                        <Link
                          href={`/admin/content/${id}/revisions?diff=${rev.version}`}
                          className="text-[11px] text-accent hover:underline"
                        >
                          View diff
                        </Link>
                      )}
                      {i > 0 && (
                        <RestoreButton
                          contentId={id}
                          revisionId={rev.id}
                          version={rev.version}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
