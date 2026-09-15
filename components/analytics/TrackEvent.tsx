"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics";

/**
 * Fires one typed event when it mounts, then never again.
 *
 * Article pages are server components and cannot call `posthog.capture`
 * themselves. Rather than converting a page to a client component — which
 * would ship the whole article body to the browser as a serialised prop and
 * undo the paywall's server-side cut — the page renders this alongside its
 * content and the event travels as a handful of plain properties.
 *
 * One component for every view event, not one component per event: adding
 * `report_viewed` later means adding a key to `AnalyticsEvents`, not another
 * file that does the same thing.
 */
export default function TrackEvent<E extends AnalyticsEvent>({
  event,
  properties,
}: {
  event: E;
  properties: AnalyticsProperties<E>;
}) {
  const posthog = usePostHog();

  // React mounts, unmounts and remounts effects under StrictMode in
  // development while preserving refs, so this guard survives the double
  // invocation and the dev dashboard is not double-counting everything.
  const sent = useRef(false);

  useEffect(() => {
    if (!posthog || sent.current) return;
    sent.current = true;
    posthog.capture(event, properties as Record<string, unknown>);
    // Properties are derived from the route, which cannot change without a
    // remount, so the event fires once per page view by construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posthog]);

  return null;
}
