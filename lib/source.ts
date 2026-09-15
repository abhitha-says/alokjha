/**
 * Content source switchboard — Step 3 of the markdown → Postgres migration.
 *
 * Set  CONTENT_SOURCE=markdown  (or leave unset) to read the markdown files.
 * Set  CONTENT_SOURCE=db        to read from the Postgres `content` table.
 *
 * Flip the env var in Vercel to switch sources without a code deploy; flip it
 * back instantly if anything looks wrong. After a week clean on `db`, Phase 4
 * of this step deletes the parsers, moves the markdown files to `archive/` and
 * removes this flag.
 *
 * All pages and route handlers import from this module only — never directly
 * from `lib/markdown-content` or `lib/db-content`. The type signatures are
 * identical so the switch is transparent to callers.
 */

import {
  getAllEssays as mdGetAllEssays,
  getEssayBySlug as mdGetEssayBySlug,
  getEssaysByCategory as mdGetEssaysByCategory,
  getRelatedEssays as mdGetRelatedEssays,
  getSourcesForCategory as mdGetSourcesForCategory,
  getAllDeepDives as mdGetAllDeepDives,
  getDeepDiveBySlug as mdGetDeepDiveBySlug,
  getDeepDivesBySeries as mdGetDeepDivesBySeries,
  getAllReports as mdGetAllReports,
  getReportBySlug as mdGetReportBySlug,
  buildDeepDivePreview,
  type Essay,
  type DeepDive,
  type Report,
  type Category,
  CATEGORY_SLUGS,
  CATEGORY_META,
} from "./markdown-content";

import {
  getAllEssaysFromDb,
  getEssayBySlugFromDb,
  getEssaysByCategoryFromDb,
  getRelatedEssaysFromDb,
  getSourcesForCategoryFromDb,
  getAllDeepDivesFromDb,
  getDeepDiveBySlugFromDb,
  getDeepDivesBySeriesFromDb,
  getAllReportsFromDb,
  getReportBySlugFromDb,
} from "./db-content";

import { DATABASE_CONFIGURED } from "./db";

/** `markdown` until explicitly switched to `db` in the environment. */
export const CONTENT_SOURCE: "markdown" | "db" =
  process.env.CONTENT_SOURCE === "db" && DATABASE_CONFIGURED ? "db" : "markdown";

const useDb = CONTENT_SOURCE === "db";

/* ------------------------------------------------------------------ *
 * Signals (Essays)
 * ------------------------------------------------------------------ */

export async function getAllEssays(): Promise<Essay[]> {
  return useDb ? getAllEssaysFromDb() : mdGetAllEssays();
}

export async function getEssayBySlug(slug: string): Promise<Essay | undefined> {
  return useDb ? getEssayBySlugFromDb(slug) : mdGetEssayBySlug(slug);
}

export async function getEssaysByCategory(category: Category): Promise<Essay[]> {
  return useDb ? getEssaysByCategoryFromDb(category) : mdGetEssaysByCategory(category);
}

export async function getRelatedEssays(essay: Essay, count = 3): Promise<Essay[]> {
  return useDb ? getRelatedEssaysFromDb(essay, count) : mdGetRelatedEssays(essay, count);
}

export async function getSourcesForCategory(category: Category): Promise<string> {
  return useDb
    ? getSourcesForCategoryFromDb(category)
    : mdGetSourcesForCategory(category);
}

/* ------------------------------------------------------------------ *
 * Deep Dives
 * ------------------------------------------------------------------ */

export async function getAllDeepDives(): Promise<DeepDive[]> {
  return useDb ? getAllDeepDivesFromDb() : mdGetAllDeepDives();
}

export async function getDeepDiveBySlug(slug: string): Promise<DeepDive | undefined> {
  return useDb ? getDeepDiveBySlugFromDb(slug) : mdGetDeepDiveBySlug(slug);
}

export async function getDeepDivesBySeries(series: Category): Promise<DeepDive[]> {
  return useDb ? getDeepDivesBySeriesFromDb(series) : mdGetDeepDivesBySeries(series);
}

/* ------------------------------------------------------------------ *
 * Reports
 * ------------------------------------------------------------------ */

export async function getAllReports(): Promise<Report[]> {
  return useDb ? getAllReportsFromDb() : mdGetAllReports();
}

export async function getReportBySlug(slug: string): Promise<Report | undefined> {
  return useDb ? getReportBySlugFromDb(slug) : mdGetReportBySlug(slug);
}

/* ------------------------------------------------------------------ *
 * Pass-through — pure logic, not a data fetch
 * ------------------------------------------------------------------ */

// Re-export so pages only need one import.
export { buildDeepDivePreview, CATEGORY_SLUGS, CATEGORY_META };
export type { Essay, DeepDive, Report, Category };
