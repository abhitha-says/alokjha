"use client";

import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import type { ComponentProps } from "react";
import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics";

type LinkProps = Omit<ComponentProps<typeof Link>, "onClick">;

/**
 * A `next/link` that reports the click before it navigates.
 *
 * Used for the paywall's two calls to action. Keeping this separate from
 * `TrackEvent` matters because the numerator and denominator of the paywall
 * conversion rate are different kinds of measurement: one is "the boundary was
 * shown", the other is "someone chose a way past it".
 *
 * The capture is fire-and-forget. PostHog batches over `sendBeacon`, which
 * survives the page unload, so there is no need to delay the navigation — and
 * delaying navigation for an analytics call is a bad trade in any case.
 */
export default function TrackedLink<E extends AnalyticsEvent>({
  event,
  properties,
  children,
  ...linkProps
}: LinkProps & {
  event: E;
  properties: AnalyticsProperties<E>;
  children: React.ReactNode;
}) {
  const posthog = usePostHog();

  return (
    <Link
      {...linkProps}
      onClick={() => posthog?.capture(event, properties as Record<string, unknown>)}
    >
      {children}
    </Link>
  );
}
