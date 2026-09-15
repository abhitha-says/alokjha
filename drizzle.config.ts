import type { Config } from "drizzle-kit";

/**
 * Migrations run over DIRECT_URL (Supabase port 5432), not DATABASE_URL
 * (the pooler, port 6543). DDL cannot run through a transaction-mode pooler:
 * `CREATE TYPE`, `ALTER TABLE` and friends need a stable backend session.
 */
export default {
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
