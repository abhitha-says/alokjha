"use server";

import { updateTag } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { featuredPlacements, content as contentTable } from "@/lib/db/schema/content";
import { requireEditor, auditLog } from "@/lib/admin-auth";
import type { Content } from "@/lib/db/schema/content";

export type Surface = "home_hero" | "home_signals" | "home_deep_dives";

export interface PlacementInput {
  contentId: string;
  position: number;
  startsAt?: string; // ISO string or empty
  endsAt?: string;
}

/**
 * Replace all placements for a surface in one go.
 *
 * We delete all existing rows for the surface and insert the new set.
 * This is simpler and safer than diffing — the table is small (max ~10 rows
 * per surface) and curation is a low-frequency operation.
 */
export async function saveCurationAction(
  surface: Surface,
  placements: PlacementInput[]
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireEditor();

  try {
    // Read before state for audit log.
    const before = await db
      .select()
      .from(featuredPlacements)
      .where(eq(featuredPlacements.surface, surface));

    // Replace atomically.
    await db.delete(featuredPlacements).where(eq(featuredPlacements.surface, surface));

    if (placements.length > 0) {
      await db.insert(featuredPlacements).values(
        placements.map((p) => ({
          contentId: p.contentId,
          surface,
          position: p.position,
          startsAt: p.startsAt ? new Date(p.startsAt) : null,
          endsAt: p.endsAt ? new Date(p.endsAt) : null,
        }))
      );
    }

    await auditLog(actor, "curation.save", {
      targetType: "surface",
      targetId: surface,
      before: before,
      after: placements,
    });

    // Invalidate the listing caches so the homepage picks up the new order.
    updateTag("content:listing:signal");
    updateTag("content:listing:deep_dive");

    return { ok: true };
  } catch (err) {
    console.error("[saveCurationAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Add a single piece to a surface at the end.
 */
export async function addPlacementAction(
  surface: Surface,
  contentId: string
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireEditor();

  try {
    // Find the current max position for this surface.
    const existing = await db
      .select({ position: featuredPlacements.position })
      .from(featuredPlacements)
      .where(eq(featuredPlacements.surface, surface))
      .orderBy(featuredPlacements.position);

    const maxPosition = existing.length > 0
      ? Math.max(...existing.map((e) => e.position))
      : -1;

    await db.insert(featuredPlacements).values({
      contentId,
      surface,
      position: maxPosition + 1,
    });

    await auditLog(actor, "curation.add", {
      targetType: "surface",
      targetId: surface,
      after: { contentId, position: maxPosition + 1 },
    });

    updateTag("content:listing:signal");
    updateTag("content:listing:deep_dive");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Remove a placement by contentId + surface.
 */
export async function removePlacementAction(
  surface: Surface,
  contentId: string
): Promise<{ ok: boolean }> {
  const actor = await requireEditor();

  await db
    .delete(featuredPlacements)
    .where(
      and(
        eq(featuredPlacements.surface, surface),
        eq(featuredPlacements.contentId, contentId)
      )
    );

  await auditLog(actor, "curation.remove", {
    targetType: "surface",
    targetId: surface,
    after: { contentId },
  });

  updateTag("content:listing:signal");
  updateTag("content:listing:deep_dive");

  return { ok: true };
}
