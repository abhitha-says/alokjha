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

  const [row] = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);

  if (!row || row.deletedAt) notFound();

  const [{ count }] = await db
    .select({ count: db.$count(contentRevisions, eq(contentRevisions.contentId, id)) })
    .from(contentRevisions)
    .where(eq(contentRevisions.contentId, id))
    .limit(1);

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
