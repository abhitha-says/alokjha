import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Accounts and sessions.
 *
 * The four Auth.js tables (`users`, `accounts`, `sessions`,
 * `verificationTokens`) must keep their column names — the Drizzle adapter
 * writes to them directly and renaming a field breaks sign-in at runtime, not
 * at compile time. Everything outside those four is ours to shape.
 */

export const userRole = pgEnum("user_role", ["reader", "editor", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),

    /**
     * Null for readers who only ever use a magic link or Google. A password is
     * argon2id, never bcrypt — and never reversible, so this column is the
     * only place a credential exists and it cannot be read back.
     */
    passwordHash: text("password_hash"),

    role: userRole("role").notNull().default("reader"),

    /**
     * TOTP secret, required before an `admin` may reach /admin. Stored
     * encrypted at the application layer: a database backup that leaks should
     * not also hand over the second factor that protects refunds and
     * entitlement grants.
     */
    totpSecret: text("totp_secret"),
    totpConfirmedAt: timestamp("totp_confirmed_at", { withTimezone: true }),

    /** Consent to marketing email, distinct from having an account. */
    marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),

    /** Soft delete. A DPDP erasure request nulls the PII and sets this. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // Case-insensitive uniqueness enforced by the database rather than by
    // remembering to lowercase at every call site. Without this,
    // `Alok@x.com` and `alok@x.com` become two accounts with two separate
    // sets of entitlements, and the reader who paid cannot reach what they
    // bought.
    uniqueIndex("users_email_lower_idx").on(sql`lower(${table.email})`),
    index("users_role_idx").on(table.role),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ]
);

/**
 * Database sessions, not JWTs.
 *
 * A JWT cannot be revoked before it expires. On a site where the session *is*
 * the entitlement, that means a cancelled membership, a refunded purchase or a
 * banned account keeps working for the life of the token. Deleting a row here
 * ends access on the next request.
 */
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

/* ------------------------------------------------------------------ *
 * Newsletter
 * ------------------------------------------------------------------ */

export const subscriberStatus = pgEnum("subscriber_status", [
  "pending",
  "confirmed",
  "unsubscribed",
  "bounced",
]);

/**
 * Deliberately separate from `users`.
 *
 * Most people who give Human Signals an email address will never create an
 * account — the weekly Signal is the product for them. Folding the two
 * together would mean either a half-empty users table or forcing a signup on
 * someone who only wanted an email.
 */
export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),

    /** Linked opportunistically when the same address later signs in. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    status: subscriberStatus("status").notNull().default("pending"),

    /**
     * Double opt-in. A list built without it gets marked as spam often enough
     * to poison the sending domain, and a poisoned domain takes months to
     * recover — it is not a setting you can flip back.
     */
    confirmToken: text("confirm_token"),
    confirmTokenExpires: timestamp("confirm_token_expires", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    unsubscribeToken: text("unsubscribe_token").notNull(),

    /** Which page the address came from, plus any utm_* on that request. */
    sourcePage: text("source_page"),
    utm: jsonb("utm").$type<Record<string, string>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subscribers_email_lower_idx").on(sql`lower(${table.email})`),
    uniqueIndex("subscribers_unsubscribe_token_idx").on(table.unsubscribeToken),
    index("subscribers_status_idx").on(table.status),
  ]
);

/* ------------------------------------------------------------------ *
 * Audit
 * ------------------------------------------------------------------ */

/**
 * Append-only. Nothing in the application updates or deletes a row here.
 *
 * Every admin action that grants access, moves money or changes published
 * content lands in this table. When something is wrong six months from now,
 * this is the only record of who did it.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_log_actor_idx").on(table.actorId, table.createdAt),
    index("admin_audit_log_target_idx").on(table.targetType, table.targetId),
  ]
);

export type User = typeof users.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;

/* ------------------------------------------------------------------ *
 * Rate limiting (Phase 6)
 * ------------------------------------------------------------------ */

/**
 * Sliding-window counters for rate limiting.
 *
 * Key format: `<scope>:<identifier>` e.g. `newsletter:1.2.3.4`
 * Window format: ISO timestamp truncated to the window size, e.g.
 *   `2026-09-15T10:05` for a 1-minute window at 10:05.
 *
 * A cron or application-layer sweep deletes rows older than 24h to prevent
 * unbounded table growth. The cleanup runs alongside the existing sweep-grace
 * cron rather than requiring a new one.
 */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").notNull(),
    window: text("window").notNull(),
    count: integer("count").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.window] }),
  ]
);
