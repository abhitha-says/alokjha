"use server";

import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { subscribers } from "@/lib/db/schema/auth";
import { sendEmail, siteUrl } from "@/lib/email";
import { captureServerEvent, ANONYMOUS_DISTINCT_ID } from "@/lib/posthog-server";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";


/**
 * Newsletter signup, with double opt-in.
 *
 * Replaces a form that set `submitted = true` and threw the address away while
 * telling the reader to check their inbox. Every subscriber captured before
 * this shipped is unrecoverable.
 *
 * Double opt-in is not optional politeness. A list built without it collects
 * typos and other people's addresses, gets marked as spam often enough to
 * poison the sending domain, and a poisoned domain is a months-long problem
 * with no switch to flip back.
 */

export interface SubscribeResult {
  ok: boolean;
  message: string;
}

/** How long a confirmation link stays valid. */
const CONFIRM_TOKEN_TTL_HOURS = 48;

/**
 * Minimum gap between confirmation emails to the same address.
 *
 * The abuse this prevents is not signups — it is using this form to mail-bomb
 * somebody else's inbox. Throttling on the address is what stops that; an
 * IP-based limit would not, since the target is chosen by the attacker.
 */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Deliberately permissive. Real addresses violate the strict grammar often
 * enough that an aggressive regex rejects more genuine readers than typos,
 * and the confirmation email is the actual validation.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function token(): string {
  return randomBytes(32).toString("base64url");
}

export async function subscribeToNewsletter(
  formData: FormData
): Promise<SubscribeResult> {
  const raw = formData.get("email");
  const sourcePage =
    typeof formData.get("source") === "string"
      ? (formData.get("source") as string)
      : "unknown";

  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  // IP-based rate limit: 5 signup attempts per IP per hour.
  // Prevents the form being weaponised to spam a third party's inbox.
  // This fires before the email validation so the limit applies to all
  // requests, not just well-formed ones.
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "127.0.0.1";
  const rl = await rateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      message: "Too many requests. Please try again in a little while.",
    };
  }

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "That does not look like an email address." };
  }

  if (!DATABASE_CONFIGURED) {
    return {
      ok: false,
      message: "Subscriptions are briefly unavailable. Please try again shortly.",
    };
  }

  // One reply for every outcome below. Saying "you are already subscribed"
  // would turn this form into an endpoint that confirms whether a given
  // address reads Human Signals, which is not ours to disclose.
  const success: SubscribeResult = {
    ok: true,
    message: "Thanks — check your inbox to confirm. Nothing else will arrive.",
  };

  try {
    const [existing] = await db
      .select({
        id: subscribers.id,
        status: subscribers.status,
        createdAt: subscribers.createdAt,
        confirmTokenExpires: subscribers.confirmTokenExpires,
      })
      .from(subscribers)
      .where(sql`lower(${subscribers.email}) = ${email}`)
      .limit(1);

    if (existing?.status === "confirmed") return success;

    // Already asked, very recently. Stay quiet rather than send again.
    if (existing) {
      const [recent] = await db
        .select({ id: subscribers.id })
        .from(subscribers)
        .where(
          and(
            eq(subscribers.id, existing.id),
            gt(
              subscribers.createdAt,
              new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000)
            )
          )
        )
        .limit(1);
      if (recent) return success;
    }

    const confirmToken = token();
    const expires = new Date(Date.now() + CONFIRM_TOKEN_TTL_HOURS * 3600 * 1000);

    // Raw SQL because the arbiter is the expression index on `lower(email)`,
    // and Drizzle's typed `onConflictDoUpdate` only accepts plain columns.
    // Postgres cannot match `ON CONFLICT (email)` to a `lower(email)` index,
    // so the target has to be written out as the same expression.
    await db.execute(sql`
      insert into ${subscribers}
        (email, status, confirm_token, confirm_token_expires, unsubscribe_token, source_page)
      values
        (
          ${email}, 'pending', ${confirmToken},
          -- Sent as an ISO string with an explicit cast: in a raw template
          -- Drizzle has no column metadata to infer the type from, and the
          -- driver rejects a bare Date.
          ${expires.toISOString()}::timestamptz,
          ${token()}, ${sourcePage}
        )
      on conflict (lower(email)) do update set
        confirm_token         = excluded.confirm_token,
        confirm_token_expires = excluded.confirm_token_expires,
        status                = 'pending',
        created_at            = now()
    `);

    await sendEmail({
      to: email,
      subject: "Confirm your Human Signals subscription",
      text:
        `One more step.\n\n` +
        `Confirm your subscription to Human Signals and the weekly Signal will ` +
        `start arriving:\n\n` +
        `${siteUrl(`/api/newsletter/confirm?token=${confirmToken}`)}\n\n` +
        `The link works for the next ${CONFIRM_TOKEN_TTL_HOURS} hours. If you did ` +
        `not ask for this, ignore this message — nothing will be sent and the ` +
        `address will be removed.\n\n` +
        `Human Signals`,
    });

    after(() =>
      captureServerEvent(ANONYMOUS_DISTINCT_ID, "newsletter_subscribed", {
        source_page: sourcePage,
      })
    );

    return success;
  } catch (error) {
    // Never surface the reason. A database or Resend error reaching the form
    // tells an attacker about the stack and tells the reader nothing useful.
    console.error("[newsletter] subscribe failed", error);
    return {
      ok: false,
      message: "Something went wrong at our end. Please try again in a moment.",
    };
  }
}
