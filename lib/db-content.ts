/**
 * DB-backed content reader.
 *
 * Mirrors the public function signatures of `lib/markdown-content.ts` exactly
 * so that `lib/source.ts` can swap between the two without the pages knowing.
 *
 * Each exported function is tagged with `'use cache'` + `cacheTag` so that
 * the admin publish action can call `updateTag('content:...')` and the page
 * sees fresh data immediately (read-your-own-writes). The listing cache tags
 * let a publish also invalidate index pages.
 *
 * Requires `cacheComponents: true` in `next.config.mjs`.
 */

import "server-only";
import { and, eq, isNull, inArray, ne } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db, DATABASE_CONFIGURED } from "./db";
import { content as contentTable } from "./db/schema/content";
import {
  type Essay,
  type DeepDive,
  type Report,
  type Category,
} from "./markdown-content";

// Re-export types so callers can import from either module.
export type { Essay, DeepDive, Report, Category };

/* ------------------------------------------------------------------ *
 * Internal mappers
 * ------------------------------------------------------------------ */

type ContentRow = typeof contentTable.$inferSelect;

function rowToEssay(row: ContentRow): Essay {
  return {
    number: Number(row.number ?? 0),
    slug: row.slug,
    title: row.title,
    deck: row.deck ?? "",
    category: row.category as Category,
    body: row.bodyMd,
    readingTime: `${row.readingMinutes} min read`,
  };
}

function rowToDeepDive(row: ContentRow): DeepDive {
  return {
    number: row.number ?? "000",
    code: `HSI ${row.number ?? "000"}`,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    standfirst: row.standfirst ?? "",
    series: row.category as Category,
    teaser: row.teaser ?? "",
    body: row.bodyMd,
    sources: row.sourcesMd ?? "",
    readingTime: `${row.readingMinutes} min read`,
    isFounding: row.isFounding,
  };
}

function rowToReport(row: ContentRow): Report {
  return {
    number: row.number ?? "00",
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    standfirst: row.standfirst ?? "",
    category: row.category as Category,
    body: row.bodyMd,
    sources: row.sourcesMd ?? "",
    readingTime: `${row.readingMinutes} min read`,
  };
}

/* ------------------------------------------------------------------ *
 * Published-only predicate (the base WHERE for all reader-facing reads)
 * ------------------------------------------------------------------ */

const publishedAndNotDeleted = and(
  eq(contentTable.status, "published"),
  isNull(contentTable.deletedAt)
);

/* ------------------------------------------------------------------ *
 * Signals (Essays)
 * ------------------------------------------------------------------ */

export async function getAllEssaysFromDb(): Promise<Essay[]> {
  "use cache";
  cacheTag("content:listing:signal");

  if (!DATABASE_CONFIGURED) return [];

  const rows = await db
    .select()
    .from(contentTable)
    .where(and(eq(contentTable.kind, "signal"), publishedAndNotDeleted))
    .orderBy(contentTable.number);

  return rows.map(rowToEssay);
}

export async function getEssayBySlugFromDb(slug: string): Promise<Essay | undefined> {
  "use cache";
  cacheTag(`content:signal:${slug}`);

  if (!DATABASE_CONFIGURED) return undefined;

  const [row] = await db
    .select()
    .from(contentTable)
    .where(
      and(
        eq(contentTable.kind, "signal"),
        eq(contentTable.slug, slug),
        publishedAndNotDeleted
      )
    )
    .limit(1);

  return row ? rowToEssay(row) : undefined;
}

export async function getEssaysByCategoryFromDb(category: Category): Promise<Essay[]> {
  "use cache";
  cacheTag("content:listing:signal", `content:category:${category}`);

  if (!DATABASE_CONFIGURED) return [];

  const rows = await db
    .select()
    .from(contentTable)
    .where(
      and(
        eq(contentTable.kind, "signal"),
        eq(contentTable.category, category),
        publishedAndNotDeleted
      )
    )
    .orderBy(contentTable.number);

  return rows.map(rowToEssay);
}

export async function getRelatedEssaysFromDb(
  essay: Essay,
  count = 3
): Promise<Essay[]> {
  "use cache";
  cacheTag("content:listing:signal", `content:category:${essay.category}`);

  if (!DATABASE_CONFIGURED) return [];

  const rows = await db
    .select()
    .from(contentTable)
    .where(
      and(
        eq(contentTable.kind, "signal"),
        eq(contentTable.category, essay.category as Category),
        ne(contentTable.slug, essay.slug),
        publishedAndNotDeleted
      )
    )
    .limit(count);

  return rows.map(rowToEssay);
}

/**
 * Sources are stored per-piece on the DB path, not per-category as in the
 * markdown file. This helper collects all sources for the category by
 * aggregating signals — callers on the signal page use the essay's own
 * sources_md if it exists, or fall back to empty string.
 *
 * For now the signal detail page uses sources from the essay row directly
 * (lib/source.ts passes it through); this function is here for completeness.
 */
export async function getSourcesForCategoryFromDb(category: Category): Promise<string> {
  "use cache";
  cacheTag(`content:category:${category}`);
  return "";
}

/* ------------------------------------------------------------------ *
 * Deep Dives
 * ------------------------------------------------------------------ */

export async function getAllDeepDivesFromDb(): Promise<DeepDive[]> {
  "use cache";
  cacheTag("content:listing:deep_dive");

  if (!DATABASE_CONFIGURED) return [];

  const rows = await db
    .select()
    .from(contentTable)
    .where(and(eq(contentTable.kind, "deep_dive"), publishedAndNotDeleted))
    .orderBy(contentTable.number);

  return rows.map(rowToDeepDive);
}

export async function getDeepDiveBySlugFromDb(slug: string): Promise<DeepDive | undefined> {
  "use cache";
  cacheTag(`content:deep_dive:${slug}`);

  if (!DATABASE_CONFIGURED) return undefined;

  const [row] = await db
    .select()
    .from(contentTable)
    .where(
      and(
        eq(contentTable.kind, "deep_dive"),
        eq(contentTable.slug, slug),
        publishedAndNotDeleted
      )
    )
    .limit(1);

  return row ? rowToDeepDive(row) : undefined;
}

export async function getDeepDivesBySeriesFromDb(series: Category): Promise<DeepDive[]> {
  "use cache";
  cacheTag("content:listing:deep_dive", `content:category:${series}`);

  if (!DATABASE_CONFIGURED) return [];

  const rows = await db
    .select()
    .from(contentTable)
    .where(
      and(
        eq(contentTable.kind, "deep_dive"),
        eq(contentTable.category, series),
        publishedAndNotDeleted
      )
    )
    .orderBy(contentTable.number);

  return rows.map(rowToDeepDive);
}

/* ------------------------------------------------------------------ *
 * Reports
 * ------------------------------------------------------------------ */

export async function getAllReportsFromDb(): Promise<Report[]> {
  "use cache";
  cacheTag("content:listing:report");

  if (!DATABASE_CONFIGURED) return [];

  const rows = await db
    .select()
    .from(contentTable)
    .where(and(eq(contentTable.kind, "report"), publishedAndNotDeleted))
    .orderBy(contentTable.number);

  return rows.map(rowToReport);
}

export async function getReportBySlugFromDb(slug: string): Promise<Report | undefined> {
  "use cache";
  cacheTag(`content:report:${slug}`);

  if (!DATABASE_CONFIGURED) return undefined;

  const [row] = await db
    .select()
    .from(contentTable)
    .where(
      and(
        eq(contentTable.kind, "report"),
        eq(contentTable.slug, slug),
        publishedAndNotDeleted
      )
    )
    .limit(1);

  return row ? rowToReport(row) : undefined;
}
