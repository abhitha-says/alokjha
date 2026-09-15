"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  content as contentTable,
  contentRevisions,
  type Content,
} from "@/lib/db/schema/content";
import { requireEditor, requireAdmin, auditLog } from "@/lib/admin-auth";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Word count and reading time — derived on write, never typed by an editor. */
function deriveReadStats(bodyMd: string): {
  wordCount: number;
  readingMinutes: number;
} {
  const words = bodyMd.trim().split(/\s+/).filter(Boolean).length;
  return {
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}

/**
 * Slugify — must match lib/markdown-content.ts exactly so that a slug
 * produced here is byte-identical to what the migration generated. The
 * migration's parity gate asserts this; drift breaks every published URL.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/₹/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Invalidate all cache tags that could reference this piece. */
function invalidateTags(
  kind: Content["kind"],
  slug: string,
  category?: string | null
) {
  // updateTag is the Server Action variant of revalidateTag — it gives
  // immediate read-your-own-writes so the editor sees the change instantly
  // after publish without a stale-while-revalidate delay.
  updateTag(`content:${kind}:${slug}`);
  updateTag(`content:listing:${kind}`);
  if (category) {
    updateTag(`content:category:${category}`);
  }
}

/* ------------------------------------------------------------------ *
 * Save / upsert
 * ------------------------------------------------------------------ */

export interface SaveContentInput {
  id?: string;
  kind: Content["kind"];
  slug?: string; // manual override; auto-derived from title if absent
  number?: string;
  title: string;
  subtitle?: string;
  deck?: string;
  standfirst?: string;
  teaser?: string;
  category: Content["category"];
  bodyMd: string;
  sourcesMd?: string;
  coverImageUrl?: string;
  isFreeEdition?: boolean;
  isFounding?: boolean;
  previewShare?: string; // numeric string e.g. "0.22"
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  changeNote?: string;
}

export interface SaveContentResult {
  ok: boolean;
  id?: string;
  slug?: string;
  error?: string;
}

export async function saveContentAction(
  input: SaveContentInput
): Promise<SaveContentResult> {
  const actor = await requireEditor();

  const slug = input.slug?.trim() || slugify(input.title);
  if (!slug) return { ok: false, error: "Title is required to derive a slug." };

  const { wordCount, readingMinutes } = deriveReadStats(input.bodyMd);

  const seo =
    input.seoTitle || input.seoDescription || input.seoOgImage
      ? {
          ...(input.seoTitle ? { title: input.seoTitle } : {}),
          ...(input.seoDescription ? { description: input.seoDescription } : {}),
          ...(input.seoOgImage ? { ogImage: input.seoOgImage } : {}),
        }
      : null;

  const previewShare =
    input.previewShare && input.previewShare !== ""
      ? input.previewShare
      : null;

  // Find the next version number for this piece.
  const [versionRow] = await db
    .select({ maxVersion: max(contentRevisions.version) })
    .from(contentRevisions)
    .where(input.id ? eq(contentRevisions.contentId, input.id) : eq(contentRevisions.contentId, "00000000-0000-0000-0000-000000000000"));

  const nextVersion = (versionRow?.maxVersion ?? 0) + 1;

  let contentId: string;

  if (input.id) {
    // Update existing row.
    await db
      .update(contentTable)
      .set({
        slug,
        number: input.number ?? undefined,
        title: input.title,
        subtitle: input.subtitle ?? null,
        deck: input.deck ?? null,
        standfirst: input.standfirst ?? null,
        teaser: input.teaser ?? null,
        category: input.category,
        bodyMd: input.bodyMd,
        sourcesMd: input.sourcesMd ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        wordCount,
        readingMinutes,
        isFreeEdition: input.isFreeEdition ?? false,
        isFounding: input.isFounding ?? false,
        previewShare: previewShare,
        seo: seo as Content["seo"],
        updatedAt: new Date(),
      })
      .where(eq(contentTable.id, input.id));

    contentId = input.id;

    await auditLog(actor, "content.save", {
      targetType: "content",
      targetId: input.id,
      after: { slug, title: input.title },
    });
  } else {
    // Insert new row.
    const [newRow] = await db
      .insert(contentTable)
      .values({
        kind: input.kind,
        slug,
        number: input.number ?? null,
        title: input.title,
        subtitle: input.subtitle ?? null,
        deck: input.deck ?? null,
        standfirst: input.standfirst ?? null,
        teaser: input.teaser ?? null,
        category: input.category,
        bodyMd: input.bodyMd,
        sourcesMd: input.sourcesMd ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        wordCount,
        readingMinutes,
        status: "draft",
        isFreeEdition: input.isFreeEdition ?? false,
        isFounding: input.isFounding ?? false,
        previewShare: previewShare,
        seo: seo as Content["seo"],
        authorId: null,
      })
      .returning({ id: contentTable.id });

    contentId = newRow.id;

    await auditLog(actor, "content.create", {
      targetType: "content",
      targetId: contentId,
      after: { slug, kind: input.kind },
    });
  }

  // Append a revision row (append-only — never updated or deleted).
  await db.insert(contentRevisions).values({
    contentId,
    version: nextVersion,
    title: input.title,
    bodyMd: input.bodyMd,
    sourcesMd: input.sourcesMd ?? null,
    editorId: actor.userId,
    changeNote: input.changeNote ?? null,
  });

  // Invalidate all caches that could serve stale data for this piece.
  invalidateTags(input.kind, slug, input.category);

  return { ok: true, id: contentId, slug };
}

/* ------------------------------------------------------------------ *
 * State machine transitions
 * ------------------------------------------------------------------ */

export async function publishContentAction(id: string): Promise<void> {
  const actor = await requireEditor();

  const [row] = await db
    .select({ kind: contentTable.kind, slug: contentTable.slug, category: contentTable.category })
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);

  if (!row) throw new Error("Content not found");

  await db
    .update(contentTable)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(contentTable.id, id));

  await auditLog(actor, "content.publish", { targetType: "content", targetId: id });

  invalidateTags(row.kind, row.slug, row.category);
}

export async function scheduleContentAction(
  id: string,
  scheduledFor: Date
): Promise<void> {
  const actor = await requireEditor();

  const [row] = await db
    .select({ kind: contentTable.kind, slug: contentTable.slug, category: contentTable.category })
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);

  if (!row) throw new Error("Content not found");

  await db
    .update(contentTable)
    .set({ status: "scheduled", scheduledFor, updatedAt: new Date() })
    .where(eq(contentTable.id, id));

  await auditLog(actor, "content.schedule", {
    targetType: "content",
    targetId: id,
    after: { scheduledFor: scheduledFor.toISOString() },
  });

  invalidateTags(row.kind, row.slug, row.category);
}

export async function archiveContentAction(id: string): Promise<void> {
  const actor = await requireEditor();

  const [row] = await db
    .select({ kind: contentTable.kind, slug: contentTable.slug, category: contentTable.category })
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);

  if (!row) throw new Error("Content not found");

  await db
    .update(contentTable)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(contentTable.id, id));

  await auditLog(actor, "content.archive", { targetType: "content", targetId: id });

  invalidateTags(row.kind, row.slug, row.category);
}

export async function deleteContentAction(id: string): Promise<void> {
  const actor = await requireAdmin(); // Hard delete requires admin.

  const [row] = await db
    .select({ kind: contentTable.kind, slug: contentTable.slug, category: contentTable.category })
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);

  if (!row) throw new Error("Content not found");

  // Soft delete — keep the row for the audit trail and revision history.
  await db
    .update(contentTable)
    .set({ deletedAt: new Date() })
    .where(eq(contentTable.id, id));

  await auditLog(actor, "content.delete", { targetType: "content", targetId: id });

  invalidateTags(row.kind, row.slug, row.category);

  redirect("/admin/content");
}

/* ------------------------------------------------------------------ *
 * Revision restore
 * ------------------------------------------------------------------ */

export async function restoreRevisionAction(
  contentId: string,
  revisionId: string
): Promise<void> {
  const actor = await requireEditor();

  const [revision] = await db
    .select()
    .from(contentRevisions)
    .where(
      and(
        eq(contentRevisions.id, revisionId),
        eq(contentRevisions.contentId, contentId)
      )
    )
    .limit(1);

  if (!revision) throw new Error("Revision not found");

  const [currentRow] = await db
    .select({ kind: contentTable.kind, slug: contentTable.slug, category: contentTable.category, title: contentTable.title, bodyMd: contentTable.bodyMd })
    .from(contentTable)
    .where(eq(contentTable.id, contentId))
    .limit(1);

  if (!currentRow) throw new Error("Content not found");

  // Find the next version number.
  const [versionRow] = await db
    .select({ maxVersion: max(contentRevisions.version) })
    .from(contentRevisions)
    .where(eq(contentRevisions.contentId, contentId));

  const nextVersion = (versionRow?.maxVersion ?? 0) + 1;

  // Write the restored body back to the content row.
  await db
    .update(contentTable)
    .set({
      title: revision.title,
      bodyMd: revision.bodyMd,
      sourcesMd: revision.sourcesMd ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(contentTable.id, contentId));

  // Record the restore as a new revision.
  await db.insert(contentRevisions).values({
    contentId,
    version: nextVersion,
    title: revision.title,
    bodyMd: revision.bodyMd,
    sourcesMd: revision.sourcesMd ?? null,
    editorId: actor.userId,
    changeNote: `Restored from revision ${revision.version}`,
  });

  await auditLog(actor, "content.restore", {
    targetType: "content",
    targetId: contentId,
    before: { title: currentRow.title, bodyMd: currentRow.bodyMd.slice(0, 200) },
    after: { restoredFromRevision: revision.version },
  });

  invalidateTags(currentRow.kind, currentRow.slug, currentRow.category);
}
