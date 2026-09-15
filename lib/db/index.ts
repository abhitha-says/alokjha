import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The database connection.
 *
 * Two settings here are not stylistic preferences — getting either wrong takes
 * the site down under load rather than degrading it.
 *
 * `prepare: false`: DATABASE_URL points at Supabase's Supavisor pooler in
 * transaction mode (port 6543), which multiplexes many clients onto few
 * Postgres connections. Prepared statements are bound to a backend session and
 * break the moment the pooler hands you a different one.
 *
 * `max: 1`: every Vercel serverless invocation is its own process. A pool of
 * ten per invocation, times the number of concurrent invocations, exhausts
 * Postgres almost immediately. One connection per invocation, with the pooler
 * doing the actual pooling, is the arrangement that survives traffic.
 *
 * Migrations use DIRECT_URL (port 5432) instead — see drizzle.config.ts. DDL
 * cannot run through a transaction-mode pooler.
 */

/**
 * Whether a database is configured at all.
 *
 * The site has to keep serving with no database: 110 free Signals and five
 * free Deep Dives do not depend on one, and a publication going wholly dark
 * because Postgres is unreachable is a far worse failure than a reader
 * temporarily seeing the paywall. Callers check this and degrade to anonymous
 * rather than throwing — see `getEntitlements` in lib/access.ts.
 */
export const DATABASE_CONFIGURED = Boolean(process.env.DATABASE_URL);

const globalForDb = globalThis as unknown as {
  __hs_sql?: ReturnType<typeof postgres>;
};

/**
 * A syntactically valid URL that is never dialled.
 *
 * postgres.js opens no socket until the first query, so constructing a client
 * with this costs nothing and never fails. It exists so that `db` is always a
 * real Drizzle instance: `lib/access.ts` is imported by nearly every page, and
 * `DrizzleAdapter` introspects the object it is handed, so neither a throw at
 * module scope nor a lazy Proxy stand-in survives contact with them.
 *
 * Callers guard on DATABASE_CONFIGURED before querying. If one ever forgets,
 * the failure is a connection error on that one request rather than a 500 on
 * every page in the site.
 */
const PLACEHOLDER_URL = "postgresql://unconfigured@127.0.0.1:5432/unconfigured";

// Reused across hot reloads in development. Without this, every file save
// opens another pool and Postgres starts refusing connections after a few
// minutes of editing.
const client =
  globalForDb.__hs_sql ??
  postgres(process.env.DATABASE_URL ?? PLACEHOLDER_URL, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__hs_sql = client;

export const db = drizzle(client, { schema });

export { schema };
