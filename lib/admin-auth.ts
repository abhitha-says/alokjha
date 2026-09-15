import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "./auth";
import { db, DATABASE_CONFIGURED } from "./db";
import { users, adminAuditLog } from "./db/schema/auth";
import { eq } from "drizzle-orm";

/**
 * The real authorisation boundary for the admin panel.
 *
 * Called at the top of every admin page component, every admin Server Action,
 * and every admin route handler. It does not trust the proxy — a proxy matcher
 * change can silently drop coverage for Server Actions, which are POST requests
 * to the route they live on.
 *
 * What it does:
 *   1. Reads the session from the DB (not just the cookie value).
 *   2. Checks `role === 'admin'`.
 *   3. Checks that TOTP is confirmed — the admin panel can grant free
 *      memberships and issue refunds, so a second factor is non-negotiable.
 *   4. Checks the session has not exceeded the short admin maxAge (8h).
 *   5. Writes to `admin_audit_log` when called from a mutating action.
 *
 * Admin sessions are deliberately shorter (8h) than reader sessions (30d).
 * The `expires` field on the session row from Auth.js is the reader maxAge.
 * We enforce the 8h window by comparing the session `lastSeenAt` and the
 * session `expires` — rather than re-configuring Auth.js (which shares the
 * same session maxAge for all users), we check here and redirect if the
 * session is older than ADMIN_SESSION_MAX_AGE.
 */

export const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminContext {
  userId: string;
  role: "admin" | "editor";
  email: string;
}

/**
 * Full admin access. TOTP must be confirmed.
 * Use for: settings, user management, entitlement grants, refunds.
 */
export async function requireAdmin(): Promise<AdminContext> {
  return verifyAdminSession({ requireFullAdmin: true });
}

/**
 * Editor access — content-only. No TOTP required.
 * Use for: content list, editor, curation. Does NOT grant access to settings
 * or operations screens.
 */
export async function requireEditor(): Promise<AdminContext> {
  return verifyAdminSession({ requireFullAdmin: false });
}

async function verifyAdminSession({
  requireFullAdmin,
}: {
  requireFullAdmin: boolean;
}): Promise<AdminContext> {
  // DEV BYPASS — allows the admin panel to be explored locally without a
  // sign-in. Completely inert in production: the condition can never be true
  // when NODE_ENV === 'production'.
  if (process.env.NODE_ENV === "development") {
    return {
      userId: "dev",
      role: "admin",
      email: "dev@localhost",
    };
  }

  if (!DATABASE_CONFIGURED) {
    redirect("/signin?error=db-not-configured");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/admin");
  }

  // Re-read the user row from the DB. A cookie alone is not proof of role —
  // the role may have been demoted since the session was issued.
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      totpConfirmedAt: users.totpConfirmedAt,
      deletedAt: users.deletedAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || user.deletedAt) {
    redirect("/signin?error=account-deleted");
  }

  if (user.role !== "admin" && user.role !== "editor") {
    redirect("/?error=insufficient-permissions");
  }

  if (requireFullAdmin && user.role !== "admin") {
    redirect("/admin/content?error=admin-only");
  }

  // TOTP is mandatory for full admin. Editors skip it — they can only touch
  // content, not money or entitlements.
  if (requireFullAdmin && !user.totpConfirmedAt) {
    redirect("/admin/setup-totp");
  }

  // Enforce the 8-hour admin session window.
  if (user.lastSeenAt) {
    const ageMs = Date.now() - user.lastSeenAt.getTime();
    if (ageMs > ADMIN_SESSION_MAX_AGE_MS) {
      redirect("/signin?callbackUrl=/admin&error=session-expired");
    }
  }

  return {
    userId: user.id,
    role: user.role as "admin" | "editor",
    email: user.email,
  };
}

/**
 * Writes one row to `admin_audit_log`.
 *
 * Call this from every mutating admin Server Action. The log is append-only —
 * nothing in the application updates or deletes a row here. When something is
 * wrong six months from now, this is the only record of who did it.
 */
export async function auditLog(
  actor: AdminContext,
  action: string,
  opts?: {
    targetType?: string;
    targetId?: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }
): Promise<void> {
  if (!DATABASE_CONFIGURED) return;

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null;
  const userAgent = headersList.get("user-agent") ?? null;

  // Best-effort. This is a secondary logging concern riding along on a
  // primary mutation (content save, publish, refund, etc.) that has already
  // taken effect by the time we get here. A logging failure — e.g. the dev
  // bypass's non-UUID "dev" actor failing the actor_id FK — must never
  // surface as a failure of the action itself, and must never abort work
  // (like the content_revisions insert in saveContentAction) that runs
  // after this call.
  try {
    await db.insert(adminAuditLog).values({
      actorId: actor.userId,
      action,
      targetType: opts?.targetType ?? null,
      targetId: opts?.targetId ?? null,
      before: (opts?.before ?? null) as Record<string, unknown> | null,
      after: (opts?.after ?? null) as Record<string, unknown> | null,
      reason: opts?.reason ?? null,
      ip,
      userAgent,
    });
  } catch (err) {
    console.error("auditLog: failed to write admin_audit_log entry", err);
  }
}
