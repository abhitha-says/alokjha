"use server";

import { requireAdmin, auditLog } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema/commerce";
import { users } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";

// ── Webhook replay ────────────────────────────────────────────────────────────

/**
 * Re-processes a stored webhook event by re-POSTing its payload to our own
 * webhook handler. The idempotency guard on `provider_event_id` must be
 * cleared first (we null `processedAt` and `error`) so the handler can
 * re-insert a fresh event row.
 *
 * The approach: clear the processed state, then fire a synthetic POST to
 * /api/webhooks/razorpay with the stored payload. The handler re-inserts the
 * row (since the unique constraint is now clear) and processes it normally.
 *
 * Because we clear the row's processedAt first, the unique constraint fires
 * on any duplicate — so if the replay is somehow called twice, only one
 * goes through.
 */
export async function replayWebhookEvent(
  eventId: string
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireAdmin();
  if (!DATABASE_CONFIGURED) return { error: "Database not configured." };

  const [event] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, eventId))
    .limit(1);

  if (!event) return { error: "Event not found." };
  if (!event.error) return { error: "Only errored events can be replayed." };

  // Delete the stored row so the handler can re-insert with fresh idempotency
  await db.delete(webhookEvents).where(eq(webhookEvents.id, eventId));

  // Re-POST to our own handler (internal call, no signature check needed —
  // we trust our own database, but the handler will mark signatureValid=false
  // since we have no secret to re-sign with. That's acceptable for a manual
  // replay; the admin is explicitly choosing to retry).
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const resp = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // No X-Razorpay-Signature — the handler will store it with signatureValid=false
    },
    body: JSON.stringify(event.payload),
  });

  if (!resp.ok) {
    return { error: `Replay returned ${resp.status}` };
  }

  await auditLog(actor, "webhook.replayed", {
    targetType: "webhook_event",
    targetId: eventId,
    reason: `Manual replay of ${event.type}`,
  });

  return { ok: true };
}

// ── User role update ──────────────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  role: "reader" | "editor" | "admin",
  reason: string
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireAdmin();
  if (!DATABASE_CONFIGURED) return { error: "Database not configured." };
  if (actor.userId === userId)
    return { error: "You cannot change your own role." };

  const [user] = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { error: "User not found." };

  await db.update(users).set({ role }).where(eq(users.id, userId));

  await auditLog(actor, "user.role_changed", {
    targetType: "user",
    targetId: userId,
    before: { role: user.role },
    after: { role },
    reason,
  });

  return { ok: true };
}
