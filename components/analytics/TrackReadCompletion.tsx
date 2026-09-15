"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * Reports that a Signal was actually read, not merely opened.
 *
 * Pageviews are a vanity number on a site like this — the question worth
 * answering is which essays hold someone to the last paragraph. Rendered
 * directly after the article body, so it intersects the viewport only when the
 * reader has reached the end of the writing, not the end of the footer.
 *
 * `IntersectionObserver` rather than a scroll listener: no work on the main
 * thread until the sentinel is near the viewport, so this costs nothing on a
 * mid-range phone scrolling a 3,000-word essay.
 */
export default function TrackReadCompletion({
  slug,
  category,
}: {
  slug: string;
  category: string;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const posthog = usePostHog();
  const sent = useRef(false);
  // Initialised inside useEffect to avoid running during SSR prerender.
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
    const node = sentinel.current;
    if (!node || !posthog) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || sent.current) return;
        sent.current = true;

        posthog.capture("signal_completed", {
          slug,
          category,
          dwell_seconds: Math.round((Date.now() - openedAt.current) / 1000),
        });

        observer.disconnect();
      },
      // A little before the sentinel is on screen: the last line has been read
      // by the time it clears the fold, and waiting for full intersection
      // misses anyone who stops scrolling right at the end.
      { rootMargin: "0px 0px -15% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [posthog, slug, category]);

  return <div ref={sentinel} aria-hidden />;
}
