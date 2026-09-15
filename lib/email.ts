import "server-only";

/**
 * Transactional email.
 *
 * Resend's REST API over `fetch` rather than the SDK — two endpoints and a
 * bearer token do not justify a dependency, and this keeps the edge/node
 * runtime question moot.
 *
 * Deliverability is bought, not built: the one thing this module cannot do is
 * make an unverified sending domain land in an inbox. Verify the domain in
 * Resend (SPF, DKIM, and ideally DMARC) before sending anything to a real
 * reader, because a domain that starts out in spam folders takes months to
 * recover and there is no switch to flip.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Resend's shared sandbox sender. Delivers only to the address that owns the
 * Resend account, which is enough to exercise a flow end to end but must not
 * reach production — hence the warning in `sendEmail`.
 */
const SANDBOX_FROM = "Human Signals <onboarding@resend.dev>";

export const EMAIL_FROM = process.env.EMAIL_FROM || SANDBOX_FROM;
export const EMAIL_CONFIGURED = Boolean(process.env.AUTH_RESEND_KEY);

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Always sent, and always first — see `sendEmail`. */
  text: string;
  html?: string;
}

/**
 * Sends one email, or explains loudly why it could not.
 *
 * With no API key configured the message is logged instead of sent. In
 * development that is the point: the magic link and the confirmation link
 * appear in the terminal, so the whole flow is testable before Resend exists.
 * In production it throws, because an auth email that silently vanishes looks
 * to the reader exactly like a broken site.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_RESEND_KEY is not set. Refusing to silently drop a transactional email."
      );
    }
    console.info(
      `\n──────── email (not sent — AUTH_RESEND_KEY unset) ────────\n` +
        `To:      ${message.to}\n` +
        `Subject: ${message.subject}\n\n` +
        `${message.text}\n` +
        `──────────────────────────────────────────────────────────\n`
    );
    return;
  }

  if (EMAIL_FROM === SANDBOX_FROM && process.env.NODE_ENV === "production") {
    console.warn(
      "[email] Sending from Resend's sandbox address in production. It only " +
        "delivers to the Resend account owner. Set EMAIL_FROM to a verified domain."
    );
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      // Both parts, text first. A text/plain alternative measurably improves
      // placement, and it is the only version some readers ever see.
      text: message.text,
      html: message.html ?? textToHtml(message.text),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend rejected the message (${response.status}): ${detail}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal text→HTML so every message has both parts without a template. */
function textToHtml(text: string): string {
  const body = text
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p style="margin:0 0 16px;font:16px/1.6 Georgia,serif;color:#1a1a1a">` +
        `${escapeHtml(para).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  return `<div style="max-width:520px;margin:0 auto;padding:32px 24px">${body}</div>`;
}

/**
 * The canonical origin for links inside emails.
 *
 * Never derived from the request host: an attacker who can set the Host header
 * could otherwise have us email a reader a confirmation link pointing at their
 * own domain, which turns our sending reputation into their phishing vector.
 */
export function siteUrl(path: string): string {
  const base = (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
