import "server-only";

import { NextResponse } from "next/server";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { subscribers } from "@/lib/db/schema/auth";
import { desc } from "drizzle-orm";

export async function GET() {
  await requireAdmin();

  if (!DATABASE_CONFIGURED) {
    return new NextResponse("Database not configured", { status: 503 });
  }

  const rows = await db
    .select({
      id: subscribers.id,
      email: subscribers.email,
      status: subscribers.status,
      sourcePage: subscribers.sourcePage,
      confirmedAt: subscribers.confirmedAt,
      unsubscribedAt: subscribers.unsubscribedAt,
      createdAt: subscribers.createdAt,
    })
    .from(subscribers)
    .orderBy(desc(subscribers.createdAt))
    .limit(100_000);

  function esc(v: unknown): string {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const header = ["id", "email", "status", "source_page", "confirmed_at", "unsubscribed_at", "created_at"].join(",");
  const lines = [
    header,
    ...rows.map((r) =>
      [r.id, r.email, r.status, r.sourcePage, r.confirmedAt, r.unsubscribedAt, r.createdAt].map(esc).join(",")
    ),
  ].join("\n");

  const filename = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(lines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
