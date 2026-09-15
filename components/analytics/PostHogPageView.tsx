"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";

/**
 * Pageviews for the App Router.
 *
 * `posthog-js` autocapture listens for document loads. The App Router does a
 * client-side transition instead, so without this a reader who lands on the
 * homepage and then reads six Signals is recorded as a single pageview and a
 * bounce. Every per-article number on the dashboard depends on this component.
 */
function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  // The first render after `posthog.init` would otherwise double-count the
  // landing page: once from this effect, once from the SDK's own initial
  // capture in some configurations.
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog || !pathname) return;

    // The admin panel is staff-only. Its pageviews would distort every content
    // metric on the dashboard, and it renders reader emails and entitlement
    // state that have no business leaving the server.
    if (pathname.startsWith("/admin")) return;

    const query = searchParams.toString();
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;

    if (lastUrl.current === url) return;
    lastUrl.current = url;

    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}

/**
 * `useSearchParams` opts the nearest non-suspended parent out of static
 * rendering. Without this boundary every page in the app would become
 * dynamic, which on a site of 110 essentially static articles would mean
 * rendering each one on every request.
 */
export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
