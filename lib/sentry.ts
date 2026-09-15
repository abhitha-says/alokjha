import "server-only";

/**
 * Server-side error capture wrapper (Phase 6).
 *
 * This is a thin, replaceable stub. When you add Sentry to the project:
 *
 *   1. Create a Sentry project at sentry.io.
 *   2. Copy the DSN to NEXT_PUBLIC_SENTRY_DSN (client errors) and
 *      SENTRY_DSN (server errors) in .env.local and Vercel settings.
 *   3. `npm install @sentry/nextjs`
 *   4. Replace the stub body below with:
 *        import * as Sentry from "@sentry/nextjs";
 *        export const captureException = Sentry.captureException.bind(Sentry);
 *        export const captureMessage   = Sentry.captureMessage.bind(Sentry);
 *   5. Add `withSentryConfig(nextConfig, { ...opts })` in next.config.mjs.
 *   6. Set SENTRY_AUTH_TOKEN in Vercel so source maps are uploaded at build.
 *
 * Until Sentry is wired up, errors are logged to the Vercel function log,
 * which is visible in the dashboard and never silently lost.
 *
 * Configuring Sentry for /admin/*:
 *   Sentry MUST be disabled on admin routes — the same reason PostHog is.
 *   The admin panel renders reader emails and payment data. Sentry's
 *   breadcrumbs and request body capture would send that to a third party.
 *   In the real Sentry init, set `denyUrls: [/\/admin\//]` and strip
 *   sensitive headers in the `beforeSend` hook.
 */

export type CaptureOptions = {
  /** Extra key-value context attached to the event. */
  extra?: Record<string, unknown>;
  /** Tags added to the event for filtering in the Sentry UI. */
  tags?: Record<string, string>;
  /** User identity. Never include email — use internal ID only. */
  user?: { id: string };
};

/**
 * Captures an exception and reports it to the error tracker.
 *
 * Call this anywhere a caught error should be visible in the monitoring
 * dashboard rather than just in the function log.
 *
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   captureException(err, { tags: { route: "checkout" } });
 *   return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
 * }
 * ```
 */
export function captureException(
  error: unknown,
  opts?: CaptureOptions
): void {
  // Stub: log to console until @sentry/nextjs is installed.
  const message = error instanceof Error ? error.message : String(error);
  console.error("[sentry-stub] captureException", message, opts ?? "");
}

/**
 * Captures a message-level event (not an exception).
 *
 * Use for important state transitions that are not errors but need to be
 * visible in the monitoring dashboard.
 */
export function captureMessage(
  message: string,
  opts?: CaptureOptions
): void {
  console.warn("[sentry-stub] captureMessage", message, opts ?? "");
}
