import "server-only";

import { PostHog } from "posthog-node";
import {
  ANALYTICS_ENABLED,
  POSTHOG_API_HOST,
  POSTHOG_KEY,
} from "./posthog-config";
import type { AnalyticsEvent, AnalyticsProperties } from "./analytics";

/**
 * Server-side capture.
 *
 * Anything that decides money or access is recorded here rather than in the
 * browser: a client event is dropped by ad blockers, lost when the reader
 * closes the tab mid-redirect, and forgeable by anyone with a console. Once
 * Razorpay lands in Phase 4 the webhook handler is the only thing that reports
 * a completed purchase.
 *
 * The `server-only` import makes importing this from a client component a
 * build error rather than a runtime surprise — it would otherwise be a way to
 * leak the project key's server configuration into the bundle.
 */

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!ANALYTICS_ENABLED) return null;
  if (client) return client;

  client = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_API_HOST,
    // Serverless functions are frozen the moment the response is sent, so
    // there is no long-lived process for the default batching window to
    // accumulate into. Batching here means silently dropping events.
    flushAt: 1,
    flushInterval: 0,
  });

  return client;
}

/**
 * Captures one typed event and waits for it to reach PostHog.
 *
 * Always call this inside `after()` from `next/server`, never in the request
 * path — analytics must not be able to slow down or fail a checkout:
 *
 *   after(() => captureServerEvent(userId, "checkout_succeeded", { ... }))
 */
export async function captureServerEvent<E extends AnalyticsEvent>(
  distinctId: string,
  event: E,
  properties: AnalyticsProperties<E>
): Promise<void> {
  const posthog = getClient();
  if (!posthog) return;

  try {
    posthog.capture({
      distinctId,
      event,
      properties: properties as Record<string, unknown>,
    });
    await posthog.flush();
  } catch (error) {
    // A dropped analytics event is never worth a 500 to the reader. Log it
    // with enough context to notice a systematic failure and move on.
    console.error("[posthog] capture failed", { event, error });
  }
}

/**
 * Identity for requests with no signed-in reader.
 *
 * Until Phase 1 there are no accounts, so server events cannot yet be stitched
 * to the browser's anonymous ID. Routing them through one obvious placeholder
 * keeps that fact visible on the dashboard instead of scattering unattributed
 * events across generated IDs that can never be merged.
 *
 * When auth lands, pass the internal user ID — never the email, which changes
 * and would split one person into several profiles.
 */
export const ANONYMOUS_DISTINCT_ID = "anonymous-server";
