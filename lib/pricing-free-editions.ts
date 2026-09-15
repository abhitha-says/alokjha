/**
 * The Founding Five Deep Dives, released as free complete editions.
 *
 * Deliberately import-free so that the migration import script
 * (`scripts/import-content.ts`) can read this without pulling in the database
 * or Auth.js. `lib/access.ts` has its own inline copy during the expand phase —
 * both intentionally agree; they will be unified after the markdown files are
 * archived.
 *
 * The live answer for access decisions is `content.is_free_edition` in the
 * database. This constant exists only as the migration's parity target and as
 * the fallback while the DB is being populated.
 */

export const FREE_DEEP_DIVE_SLUGS: readonly string[] = [
  "the-choice-trap",
  "the-indian-buyer",
  "when-humans-trust-machines",
  "after-the-role-changes",
  "the-founder-mind-under-pressure",
];
