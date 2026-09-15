import { NextResponse } from "next/server";
import { and, eq, isNull, lte } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { content as contentTable } from "@/lib/db/schema/content";

/**
 * Publish-scheduled cron route.
 *
 * Invoked once per minute by Vercel Cron (configured in vercel.json).
 * Finds all content with `status = 'scheduled'` and `scheduled_for <= now()`,
 * sets `status = 'published'`, `published_at = now()`, and invalidates the
 * relevant cache tags so the pages serve fresh data on the next read.
 *
 * Authentication: a `CRON_SECRET` header check. The route is also excluded
 * from the proxy matcher so it does not require a session cookie. Vercel Cron
 * sets `Authorization: Bearer <CRON_SECRET>` automatically when configured.
 *
 * `revalidateTag` is deliberately called here and not from proxy.ts — the plan
 * notes explicitly that revalidateTag cannot be called from proxy.ts.
 */
export async function GET(request: Request) {
  // Authenticate the cron invocation.
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!DATABASE_CONFIGURED) {
    return NextResponse.json({ skipped: "no database configured" });
  }

  const now = new Date();

  // Find all pieces due to publish.
  const due = await db
    .select({
      id: contentTable.id,
      kind: contentTable.kind,
      slug: contentTable.slug,
      category: contentTable.category,
    })
    .from(contentTable)
    .where(
      and(
        eq(contentTable.status, "scheduled"),
        lte(contentTable.scheduledFor, now),
        isNull(contentTable.deletedAt)
      )
    );

  if (due.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  // Publish each one.
  const results: Array<{ slug: string; ok: boolean; error?: string }> = [];

  for (const row of due) {
    try {
      await db
        .update(contentTable)
        .set({
          status: "published",
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(contentTable.id, row.id));

      // Invalidate caches so the listing pages and individual pages update.
      // revalidateTag with 'max' profile: stale-while-revalidate semantics.
      // The pages serve cached content while revalidation runs in the background.
      // updateTag is only available in Server Actions; route handlers use revalidateTag.
      revalidateTag(`content:${row.kind}:${row.slug}`, "max");
      revalidateTag(`content:listing:${row.kind}`, "max");
      if (row.category) {
        revalidateTag(`content:category:${row.category}`, "max");
      }

      results.push({ slug: row.slug, ok: true });
    } catch (err) {
      results.push({
        slug: row.slug,
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const published = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(`[publish-scheduled] published=${published} failed=${failed}`, results);

  return NextResponse.json({ published, failed, results });
}
