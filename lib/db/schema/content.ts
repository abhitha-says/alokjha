import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * The body of work.
 *
 * Replaces the three markdown files at the repo root that `lib/markdown-content.ts`
 * regex-parses at runtime. One table for all three kinds rather than three
 * near-identical tables: they share every field that matters, every listing
 * page filters on the same three columns, and search has to span them anyway.
 */

export const contentKind = pgEnum("content_kind", ["signal", "deep_dive", "report"]);

export const contentStatus = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const contentCategory = pgEnum("content_category", [
  "Mind",
  "Choice",
  "Money",
  "Business",
  "AI + Human",
]);

export const content = pgTable(
  "content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: contentKind("kind").notNull(),

    /**
     * The URL. Unique per kind, and once published it is a promise — every
     * inbound link, share and search result depends on it. The admin editor
     * warns before allowing a change and the migration asserts byte-exact
     * parity with the existing `slugify()` output.
     */
    slug: text("slug").notNull(),

    /** "07" for Signals, "HSI 042" ordering for Deep Dives. Display only. */
    number: text("number"),

    title: text("title").notNull(),
    subtitle: text("subtitle"),
    /** Signals call this a deck, Deep Dives a standfirst. Same field. */
    deck: text("deck"),
    standfirst: text("standfirst"),
    teaser: text("teaser"),

    category: contentCategory("category").notNull(),

    bodyMd: text("body_md").notNull(),
    sourcesMd: text("sources_md"),

    coverImageUrl: text("cover_image_url"),

    /** Derived on write, never typed by an editor. */
    readingMinutes: integer("reading_minutes").notNull().default(1),
    wordCount: integer("word_count").notNull().default(0),

    status: contentStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),

    /**
     * Replaces the hardcoded FREE_DEEP_DIVE_SLUGS array in lib/access.ts.
     * Releasing a Deep Dive free becomes a toggle instead of a code deploy.
     */
    isFreeEdition: boolean("is_free_edition").notNull().default(false),

    /** One of the Founding Five. Display badge only, unrelated to access. */
    isFounding: boolean("is_founding").notNull().default(false),

    /**
     * Per-piece override of the 22% paywall cut. Null means use the global
     * PREVIEW_SHARE. Some Deep Dives give the argument away by paragraph four
     * and need a shorter extract.
     */
    previewShare: numeric("preview_share", { precision: 3, scale: 2 }),

    seo: jsonb("seo").$type<{
      title?: string;
      description?: string;
      ogImage?: string;
    }>(),

    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("content_kind_slug_idx").on(table.kind, table.slug),
    // Every listing page is "published items of this kind, newest first".
    // Without this index that is a sequential scan of the whole table on
    // every request to /signals and /deep-dives.
    index("content_listing_idx").on(table.kind, table.status, table.publishedAt),
    index("content_category_idx").on(table.category, table.status),
    // Lets the publish cron find due items without scanning.
    index("content_scheduled_idx").on(table.scheduledFor),
  ]
);

/**
 * Append-only revision history.
 *
 * Non-negotiable for a body of work this size. One bad paste into a
 * 3,000-word Deep Dive is otherwise unrecoverable, and the markdown files this
 * replaces at least had git behind them.
 */
export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    sourcesMd: text("sources_md"),
    editorId: uuid("editor_id").references(() => users.id, { onDelete: "set null" }),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("content_revisions_version_idx").on(table.contentId, table.version),
  ]
);

export const placementSurface = pgEnum("placement_surface", [
  "home_hero",
  "home_signals",
  "home_deep_dives",
]);

/**
 * Replaces the hardcoded `featuredSignalSlugs` array in lib/content.ts.
 * Start and end timestamps so a feature can be queued rather than swapped by
 * hand on the morning it should go live.
 */
export const featuredPlacements = pgTable(
  "featured_placements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    surface: placementSurface("surface").notNull(),
    position: integer("position").notNull(),
    /** Curated by hand; the rest of the card is read live from `content`. */
    imageUrl: text("image_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
  },
  (table) => [index("featured_placements_surface_idx").on(table.surface, table.position)]
);

export type Content = typeof content.$inferSelect;
export type ContentRevision = typeof contentRevisions.$inferSelect;
