import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { content as contentTable, contentRevisions } from "@/lib/db/schema/content";
import { requireEditor } from "@/lib/admin-auth";
import ContentEditor from "./ContentEditor";

// Auth + DB reads on every request — must not be prerendered.
export const instant = false;

export default async function AdminContentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEditor();

  const { id } = await params;

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="p-8 text-muted text-[13px]">
        Database not configured. Set DATABASE_URL to edit content.
      </div>
    );
  }

  // Independent of each other — run together instead of round-tripping twice.
  const [rowResult, count] = await Promise.all([
    db.select().from(contentTable).where(eq(contentTable.id, id)).limit(1),
    // db.$count() as a standalone call (see app/api/checkout/route.ts) always
    // resolves to a number, including 0. Wrapping it in an outer
    // .from(contentRevisions).where(...) — as this used to — filters the outer
    // query by the same predicate, so a piece with zero revisions (e.g. one
    // whose first save never got as far as inserting a revision row) returned
    // an empty result set instead of a zero, and the `[{ count }]` destructure
    // threw on undefined.
    db.$count(contentRevisions, eq(contentRevisions.contentId, id)),
  ]);
  const [row] = rowResult;

  if (!row || row.deletedAt) notFound();

  return (
    <ContentEditor
      initial={{
        id: row.id,
        kind: row.kind,
        slug: row.slug,
        number: row.number,
        title: row.title,
        subtitle: row.subtitle,
        deck: row.deck,
        standfirst: row.standfirst,
        teaser: row.teaser,
        category: row.category,
        bodyMd: row.bodyMd,
        sourcesMd: row.sourcesMd,
        coverImageUrl: row.coverImageUrl,
        status: row.status,
        scheduledFor: row.scheduledFor,
        publishedAt: row.publishedAt,
        isFreeEdition: row.isFreeEdition,
        isFounding: row.isFounding,
        previewShare: row.previewShare,
        seo: row.seo,
        wordCount: row.wordCount,
        readingMinutes: row.readingMinutes,
      }}
      revisionCount={Number(count ?? 0)}
    />
  );
}
