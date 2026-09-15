import "server-only";

import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * Razorpay client singleton.
 *
 * Key rules that must never be violated:
 *
 *   1. RAZORPAY_KEY_ID is public (it ships in the browser Checkout JS call),
 *      but RAZORPAY_KEY_SECRET is server-only and must never be in a client
 *      component or a NEXT_PUBLIC_ variable.
 *
 *   2. Amounts always come from the database (plans.amount_paise), not from the
 *      browser. If an amount can travel from client to server, someone buys a
 *      ₹1,499 membership for ₹1.
 *
 *   3. Entitlements are granted from the webhook, not from the browser-side
 *      payment success callback. The callback is a UI hint; the webhook is the
 *      source of truth.
 */

export const RAZORPAY_CONFIGURED = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);

// Lazily instantiated — the Razorpay constructor throws when credentials are
// missing, so we do not call it at module scope where it would crash every
// page that imports this module while credentials are not yet set.
let _client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (!RAZORPAY_CONFIGURED) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }
  if (_client) return _client;
  _client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
  return _client;
}

/**
 * Verifies the `X-Razorpay-Signature` header on an incoming webhook.
 *
 * Razorpay signs the raw body with HMAC-SHA256 using RAZORPAY_WEBHOOK_SECRET.
 * Timing-safe comparison prevents a timing oracle that could leak the secret.
 *
 * IMPORTANT: call this with the raw body string (from `await request.text()`).
 * JSON-parsing then re-stringifying changes key order and whitespace, breaking
 * the signature.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Both buffers must be the same length for timingSafeEqual or it throws.
  if (expected.length !== signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signature, "utf8")
  );
}

/**
 * Converts whole rupees to paise.
 * All amounts in the database, in Razorpay API calls, and in analytics are
 * integer paise — never floating-point rupees.
 */
export const rupeesToPaise = (rupees: number): number => rupees * 100;

/** Formats a paise amount as a human-readable rupee string (e.g. "₹1,499"). */
export const paiseToRupeeLabel = (paise: number): string =>
  `₹${(paise / 100).toLocaleString("en-IN")}`;
