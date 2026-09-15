/**
 * Imports the three markdown files at the repo root into the `content` table.
 *
 *   npm run db:import          # dry run — parses, checks, writes nothing
 *   npm run db:import -- --write
 *
 * Idempotent: upserts on (kind, slug), so re-running is safe and updates in
 * place rather than duplicating.
 *
 * The parity gate below is the point of this script. The thing that can go
 * catastrophically wrong in this migration is not a failed insert — it is a
 * slug that comes out one character different from what `slugify()` produces
 * today. Every published URL, every share, every inbound link and every search
 * result points at those slugs. A silent drift breaks all of them at once, and
 * the damage is only visible weeks later in the 404 log.
 *
 * So: nothing is written unless every check passes.
 */

import postgres from "postgres";
import {
  getAllEssays,
  getAllDeepDives,
  getAllReports,
} from "../lib/markdown-content.ts";
import { FREE_DEEP_DIVE_SLUGS } from "../lib/pricing-free-editions.ts";

const WRITE = process.argv.includes("--write");

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set.");

/** What the markdown is expected to contain. A change here is a decision. */
const EXPECTED = { signal: 50, deep_dive: 55, report: 5 } as const;

type Kind = keyof typeof EXPECTED;

interface Row {
  kind: Kind;
  slug: string;
  number: string | null;
  title: string;
  subtitle: string | null;
  deck: string | null;
  standfirst: string | null;
  teaser: string | null;
  category: string;
  bodyMd: string;
  sourcesMd: string | null;
  readingMinutes: number;
  wordCount: number;
  isFreeEdition: boolean;
  isFounding: boolean;
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const minutes = (label: string) => Math.max(1, parseInt(label, 10) || 1);

function collect(): Row[] {
  const rows: Row[] = [];

  for (const essay of getAllEssays()) {
    rows.push({
      kind: "signal",
      slug: essay.slug,
      number: String(essay.number),
      title: essay.title,
      subtitle: null,
      deck: essay.deck,
      standfirst: null,
      teaser: null,
      category: essay.category,
      bodyMd: essay.body,
      sourcesMd: null,
      readingMinutes: minutes(essay.readingTime),
      wordCount: words(essay.body),
      // Signals are free to discover. That is the whole premise of the site.
      isFreeEdition: true,
      isFounding: false,
    });
  }

  for (const dive of getAllDeepDives()) {
    rows.push({
      kind: "deep_dive",
      slug: dive.slug,
      number: dive.number,
      title: dive.title,
      subtitle: dive.subtitle,
      deck: null,
      standfirst: dive.standfirst || null,
      teaser: dive.teaser || null,
      category: dive.series,
      bodyMd: dive.body,
      sourcesMd: dive.sources || null,
      readingMinutes: minutes(dive.readingTime),
      wordCount: words(dive.body),
      isFreeEdition: FREE_DEEP_DIVE_SLUGS.includes(dive.slug),
      isFounding: dive.isFounding,
    });
  }

  for (const report of getAllReports()) {
    rows.push({
      kind: "report",
      slug: report.slug,
      number: report.number,
      title: report.title,
      subtitle: report.subtitle,
      deck: null,
      standfirst: report.standfirst || null,
      teaser: null,
      category: report.category,
      bodyMd: report.body,
      sourcesMd: report.sources || null,
      readingMinutes: minutes(report.readingTime),
      wordCount: words(report.body),
      isFreeEdition: true,
      isFounding: true,
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ *
 * Parity gate
 * ------------------------------------------------------------------ */

const failures: string[] = [];
const fail = (message: string) => failures.push(message);

function check(rows: Row[]) {
  // 1. Counts. A parser regression shows up here first and nowhere else.
  for (const [kind, expected] of Object.entries(EXPECTED)) {
    const actual = rows.filter((r) => r.kind === kind).length;
    if (actual !== expected) {
      fail(`${kind}: parsed ${actual}, expected ${expected}`);
    }
  }

  // 2. Slugs. The check this whole script exists for.
  for (const row of rows) {
    if (!row.slug) {
      fail(`${row.kind} "${row.title}": empty slug`);
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(row.slug)) {
      fail(`${row.kind} "${row.slug}": slug has characters outside [a-z0-9-]`);
    }
  }

  // 3. Uniqueness within a kind — the DB has a unique index on (kind, slug),
  //    so a collision here would surface as a confusing insert failure.
  for (const kind of Object.keys(EXPECTED) as Kind[]) {
    const slugs = rows.filter((r) => r.kind === kind).map((r) => r.slug);
    const seen = new Set<string>();
    for (const slug of slugs) {
      if (seen.has(slug)) fail(`${kind}: duplicate slug "${slug}"`);
      seen.add(slug);
    }
  }

  // 4. Free editions. Exactly the Founding Five, no more and no fewer —
  //    one slug adrift here either paywalls a piece that was promised free
  //    or gives away one that is meant to be sold.
  const free = rows
    .filter((r) => r.kind === "deep_dive" && r.isFreeEdition)
    .map((r) => r.slug)
    .sort();
  const expectedFree = [...FREE_DEEP_DIVE_SLUGS].sort();
  if (JSON.stringify(free) !== JSON.stringify(expectedFree)) {
    fail(
      `free deep dives mismatch:\n    got      ${JSON.stringify(free)}\n` +
        `    expected ${JSON.stringify(expectedFree)}`
    );
  }

  // 5. Nothing empty. A piece that parsed to a title and no body would
  //    otherwise publish as a blank page.
  for (const row of rows) {
    if (row.wordCount < 50) {
      fail(`${row.kind} "${row.slug}": body is only ${row.wordCount} words`);
    }
    if (!row.title.trim()) fail(`${row.kind} "${row.slug}": empty title`);
  }
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const rows = collect();
check(rows);

console.log(`\nParsed ${rows.length} pieces from markdown:`);
for (const kind of Object.keys(EXPECTED) as Kind[]) {
  const of = rows.filter((r) => r.kind === kind);
  const totalWords = of.reduce((sum, r) => sum + r.wordCount, 0);
  console.log(
    `  ${kind.padEnd(10)} ${String(of.length).padStart(3)}  ` +
      `${totalWords.toLocaleString("en-IN").padStart(9)} words`
  );
}

if (failures.length) {
  console.error(`\n✗ Parity gate failed — nothing written.\n`);
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}

console.log(`\n✓ Parity gate passed (counts, slugs, uniqueness, free editions, bodies).`);

if (!WRITE) {
  console.log(`\nDry run. Re-run with --write to import.\n`);
  process.exit(0);
}

const sql = postgres(url, { max: 1, prepare: false });
let written = 0;

for (const row of rows) {
  await sql`
    insert into content (
      kind, slug, number, title, subtitle, deck, standfirst, teaser,
      category, body_md, sources_md, reading_minutes, word_count,
      status, published_at, is_free_edition, is_founding
    ) values (
      ${row.kind}::content_kind, ${row.slug}, ${row.number}, ${row.title},
      ${row.subtitle}, ${row.deck}, ${row.standfirst}, ${row.teaser},
      ${row.category}::content_category, ${row.bodyMd}, ${row.sourcesMd},
      ${row.readingMinutes}, ${row.wordCount},
      'published'::content_status, now(), ${row.isFreeEdition}, ${row.isFounding}
    )
    on conflict (kind, slug) do update set
      number          = excluded.number,
      title           = excluded.title,
      subtitle        = excluded.subtitle,
      deck            = excluded.deck,
      standfirst      = excluded.standfirst,
      teaser          = excluded.teaser,
      category        = excluded.category,
      body_md         = excluded.body_md,
      sources_md      = excluded.sources_md,
      reading_minutes = excluded.reading_minutes,
      word_count      = excluded.word_count,
      is_free_edition = excluded.is_free_edition,
      is_founding     = excluded.is_founding,
      updated_at      = now()
  `;
  written++;
}

// Read back and compare, rather than trusting the write. An upsert that
// silently matched the wrong row would otherwise look like a success.
const [{ n: inDb }] = await sql<{ n: number }[]>`
  select count(*)::int as n from content where deleted_at is null
`;
const missing = rows.length - Number(inDb);

console.log(`\nWrote ${written} rows. ${inDb} in the table.`);
if (missing !== 0) {
  console.error(`✗ Expected ${rows.length} rows, found ${inDb}.`);
  await sql.end();
  process.exit(1);
}

console.log(`✓ Import verified.\n`);
await sql.end();
