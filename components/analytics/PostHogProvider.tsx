"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import {
  ANALYTICS_ENABLED,
  POSTHOG_KEY,
  POSTHOG_PROXY_PATH,
  POSTHOG_UI_HOST,
} from "@/lib/posthog-config";
import PostHogPageView from "./PostHogPageView";

/**
 * Inner component that calls usePathname() — a dynamic hook.
 * Wrapped in <Suspense> by the outer shell so the static prerender can
 * complete without it. The admin-route guard lives here where pathname
 * is available.
 */
function PostHogInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Do NOT initialise PostHog on admin routes.
  //
  // The admin panel shows reader emails, entitlement records and payment
  // details. Sending those screens to a session-replay third party is a PII
  // breach and a breach of reader trust. Admin editing sessions also pollute
  // the reader-facing funnels (signal_viewed, paywall_hit, etc.) built on
  // PostHog dashboards — the editor opens every piece of content, which skews
  // every content-quality and paywall-conversion metric.
  //
  // The CSP on /admin/* already blocks the PostHog SDK at the header level,
  // but the check here is defence-in-depth: if the CSP is relaxed for a
  // debugging session, analytics still stays off.
  const isAdminRoute = pathname?.startsWith("/admin");

  // `posthog.init` is idempotent but not free, and React runs effects twice in
  // development under StrictMode. Gate on state so the tree below only mounts
  // once the client is genuinely ready.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ANALYTICS_ENABLED || isAdminRoute) return;

    posthog.init(POSTHOG_KEY!, {
      api_host: POSTHOG_PROXY_PATH,
      ui_host: POSTHOG_UI_HOST,

      // The App Router does not fire a document load on client-side
      // navigation, so autocapture sees only the first page of a session.
      // PostHogPageView captures them by hand instead.
      capture_pageview: false,
      capture_pageleave: true,

      // Anonymous readers are counted but get no stored person profile. On a
      // site whose whole premise is that most of it is free to read, profiling
      // every drive-by visitor is the difference between a small bill and a
      // large one, and none of those profiles are ever queried.
      person_profiles: "identified_only",

      session_recording: {
        // Not optional. This site has an email capture on nearly every page
        // and will have a card form at /membership. Unmasked replay would
        // stream both into a third party, which is a breach, not a metric.
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      },

      // Replay is sampled server-side from the project settings; keep it off
      // until a reader is identified so anonymous sessions cost nothing.
      disable_session_recording: true,

      loaded: () => setReady(true),
    });

    setReady(true);
  }, [isAdminRoute]);

  if (!ANALYTICS_ENABLED || isAdminRoute) return <>{children}</>;

  return (
    <Provider client={posthog}>
      {ready && <PostHogPageView />}
      {children}
    </Provider>
  );
}

/**
 * Outer shell — no dynamic hooks, so the static prerender can complete.
 * PostHogInner (which calls usePathname) streams in via Suspense.
 */
export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<>{children}</>}>
      <PostHogInner>{children}</PostHogInner>
    </Suspense>
  );
}
