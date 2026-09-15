import "server-only";

import { sql } from "drizzle-orm";
import { db, DATABASE_CONFIGURED } from "./db";
import { rateLimitBuckets } from "./db/schema/auth";

/**
 * Result of a rate-limit check.
 *
 * When `ok` is false the caller should return HTTP 429 with the
 * `Retry-After` header set to `retryAfter` seconds.
 */
export interface RateLimitResult {
  ok: boolean;
  /** Requests remaining in this window (0 when ok is false). */
  remaining: number;
  /** Seconds until the current window resets. 0 when ok is true. */
  retryAfter: number;
}

/**
 * Sliding-window rate limiter backed by Postgres.
 *
 * @param key        Identifies the rate-limited resource and identity.
 *                   Format: `<scope>:<identifier>` — e.g. `search:1.2.3.4`
 *                   or `checkout:<userId>`.
 * @param limit      Maximum number of requests allowed per window.
 * @param windowMs   Window size in milliseconds.
 *
 * Each (key, window) pair is one row. The window label is the ISO timestamp
 * of `Date.now()` truncated to `windowMs`, so all requests within the same
 * window share one counter. The upsert increments atomically.
 *
 * If the database is not configured the check always passes — the site must
 * stay up even without a database, and rate-limiting is defence-in-depth,
 * not a hard gate.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!DATABASE_CONFIGURED) {
    return { ok: true, remaining: limit, retryAfter: 0 };
  }

  // Truncate the current timestamp to the window boundary.
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowLabel = new Date(windowStart).toISOString();
  const windowEnd = windowStart + windowMs;
  const retryAfter = Math.ceil((windowEnd - now) / 1000);

  // Upsert: insert with count=1, or increment on conflict.
  // Drizzle raw SQL because the ON CONFLICT ... DO UPDATE with arithmetic
  // is clumsier through the typed API.
  const [row] = await db
    .insert(rateLimitBuckets)
    .values({
      key,
      window: windowLabel,
      count: 1,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.key, rateLimitBuckets.window],
      set: {
        count: sql`${rateLimitBuckets.count} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ count: rateLimitBuckets.count });

  const count = row?.count ?? 1;
  const ok = count <= limit;

  return {
    ok,
    remaining: Math.max(0, limit - count),
    retryAfter: ok ? 0 : retryAfter,
  };
}

/**
 * Extracts the best available IP from a Next.js Request.
 *
 * Prefers `x-forwarded-for` (set by Vercel and most CDNs) and falls back to
 * `x-real-ip`. Returns a stable placeholder for local development where
 * neither header is set, so rate limits still work in tests.
 */
export function getIp(request: Request): string {
  const xff = (request.headers as Headers).get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = (request.headers as Headers).get("x-real-ip");
  if (xri) return xri.trim();
  return "127.0.0.1";
}

/**
 * Sweeps rate_limit_buckets rows older than 24 hours.
 *
 * Call from the existing sweep-grace cron (`/api/admin/sweep-grace`) so no
 * additional cron slot is needed.
 */
export async function sweepRateLimitBuckets(): Promise<number> {
  if (!DATABASE_CONFIGURED) return 0;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db
    .delete(rateLimitBuckets)
    .where(sql`${rateLimitBuckets.updatedAt} < ${cutoff.toISOString()}::timestamptz`)
    .returning({ key: rateLimitBuckets.key });
  return result.length;
}
