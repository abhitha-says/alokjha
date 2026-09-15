import { and, eq, isNull } from "drizzle-orm";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import {
  featuredPlacements,
  content as contentTable,
} from "@/lib/db/schema/content";
import { requireEditor } from "@/lib/admin-auth";
import CurationClient, {
  type PlacementRow,
  type AvailableContent,
} from "./CurationClient";

export const instant = false;

export default async function CurationPage() {
  await requireEditor();

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">
        Database not configured. Set DATABASE_URL to manage curation.
      </div>
    );
  }

  // Placements and the available-content list are independent — fetch together.
  const [placementRows, publishedContent] = await Promise.all([
    db
      .select({
        id: featuredPlacements.id,
        contentId: featuredPlacements.contentId,
        surface: featuredPlacements.surface,
        position: featuredPlacements.position,
        startsAt: featuredPlacements.startsAt,
        endsAt: featuredPlacements.endsAt,
        title: contentTable.title,
        kind: contentTable.kind,
        slug: contentTable.slug,
      })
      .from(featuredPlacements)
      .innerJoin(contentTable, eq(featuredPlacements.contentId, contentTable.id))
      .where(isNull(contentTable.deletedAt))
      .orderBy(featuredPlacements.position),

    // Published content available to add to surfaces.
    db
      .select({
        id: contentTable.id,
        title: contentTable.title,
        kind: contentTable.kind,
        slug: contentTable.slug,
      })
      .from(contentTable)
      .where(
        and(eq(contentTable.status, "published"), isNull(contentTable.deletedAt))
      )
      .orderBy(contentTable.title),
  ]);

  function toPlacementRow(p: (typeof placementRows)[number]): PlacementRow {
    return {
      id: p.id,
      contentId: p.contentId,
      title: p.title,
      kind: p.kind,
      slug: p.slug,
      startsAt: p.startsAt ? p.startsAt.toISOString() : null,
      endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    };
  }

  const heroPlacements = placementRows
    .filter((p) => p.surface === "home_hero")
    .map(toPlacementRow);

  const signalPlacements = placementRows
    .filter((p) => p.surface === "home_signals")
    .map(toPlacementRow);

  const deepDivePlacements = placementRows
    .filter((p) => p.surface === "home_deep_dives")
    .map(toPlacementRow);

  const availableSignals: AvailableContent[] = publishedContent
    .filter((c) => c.kind === "signal")
    .map((c) => ({ id: c.id, title: c.title, kind: c.kind, slug: c.slug }));

  const availableDeepDives: AvailableContent[] = publishedContent
    .filter((c) => c.kind === "deep_dive")
    .map((c) => ({ id: c.id, title: c.title, kind: c.kind, slug: c.slug }));

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-serif font-semibold text-ink">
          Homepage curation
        </h1>
        <p className="text-[13px] text-muted mt-1">
          Drag to reorder. Add scheduled start/end times to queue features.
          Save each section separately.
        </p>
      </div>

      <CurationClient
        heroPlacements={heroPlacements}
        signalPlacements={signalPlacements}
        deepDivePlacements={deepDivePlacements}
        availableSignals={availableSignals}
        availableDeepDives={availableDeepDives}
      />
    </div>
  );
}
