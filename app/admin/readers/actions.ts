"use server";

import { requireAdmin, auditLog } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { entitlements } from "@/lib/db/schema/commerce";
import { users } from "@/lib/db/schema/auth";
import { eq, sql } from "drizzle-orm";

// ── Grant ─────────────────────────────────────────────────────────────────────

export async function grantEntitlement(
  userId: string,
  kind: "membership" | "deep_dive",
  plan: string | undefined,
  slug: string | undefined,
  reason: string
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireAdmin();
  if (!DATABASE_CONFIGURED) return { error: "Database not configured." };
  if (!reason.trim()) return { error: "Reason is required." };
  if (kind === "deep_dive" && !slug) return { error: "Slug required for deep_dive." };

  const [row] = await db
    .insert(entitlements)
    .values({
      userId,
      kind,
      plan: kind === "membership" ? (plan as "monthly" | "annual" | "founding") : null,
      contentSlug: kind === "deep_dive" ? slug : null,
      expiresAt: null, // manual grants are permanent
      note: `manual grant: ${reason}`,
    })
    .returning({ id: entitlements.id });

  await auditLog(actor, "entitlement.granted", {
    targetType: "user",
    targetId: userId,
    after: { kind, plan, slug },
    reason,
  });

  return { ok: true };
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export async function revokeEntitlement(
  entitlementId: string,
  userId: string,
  reason: string
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireAdmin();
  if (!DATABASE_CONFIGURED) return { error: "Database not configured." };
  if (!reason.trim()) return { error: "Reason is required." };

  const [existing] = await db
    .select()
    .from(entitlements)
    .where(eq(entitlements.id, entitlementId))
    .limit(1);

  if (!existing) return { error: "Entitlement not found." };
  if (existing.revokedAt) return { error: "Already revoked." };

  await db
    .update(entitlements)
    .set({ revokedAt: new Date(), note: `manual revoke: ${reason}` })
    .where(eq(entitlements.id, entitlementId));

  await auditLog(actor, "entitlement.revoked", {
    targetType: "user",
    targetId: userId,
    before: { kind: existing.kind, plan: existing.plan, slug: existing.contentSlug },
    reason,
  });

  return { ok: true };
}

// ── Delete account (DPDP/GDPR erasure) ────────────────────────────────────────

export async function deleteAccount(
  userId: string,
  reason: string
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireAdmin();
  if (!DATABASE_CONFIGURED) return { error: "Database not configured." };
  if (!reason.trim()) return { error: "Reason is required." };
  if (actor.userId === userId)
    return { error: "You cannot delete your own account." };

  const [user] = await db
    .select({ id: users.id, email: users.email, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { error: "User not found." };
  if (user.deletedAt) return { error: "Account already deleted." };

  // Null out PII columns, set deleted_at. Payment/entitlement rows are kept
  // for audit and accounting purposes.
  await db
    .update(users)
    .set({
      email: `deleted-${userId}@deleted.invalid`,
      name: null,
      image: null,
      passwordHash: null,
      totpSecret: null,
      marketingConsentAt: null,
      deletedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await auditLog(actor, "account.deleted", {
    targetType: "user",
    targetId: userId,
    before: { email: user.email },
    reason,
  });

  return { ok: true };
}
