/** @type {import('next').NextConfig} */

// Mirrors lib/posthog-config.ts, which this file cannot import (ESM JS vs TS).
// If the region changes, change it in both places.
const posthogRegion = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "eu" : "us";

const nextConfig = {
  // Required for `use cache` + cacheTag in lib/db-content.ts (Phase 2).
  // Has no effect on the default markdown path.
  cacheComponents: true,

  turbopack: {
    root: import.meta.dirname,
  },

  // PostHog's ingestion API is trailing-slash sensitive and the SDK posts to
  // paths like `/e/` and `/decide/`. Next would otherwise answer each of those
  // with a 308 to the slash-less form, doubling every analytics round trip.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      // Serves the PostHog SDK bundle and session-replay worker from our own
      // origin, so a blocklist entry for posthog.com does not silently take
      // analytics out on roughly a third of readers.
      {
        source: "/ingest/static/:path*",
        destination: `https://${posthogRegion}-assets.i.posthog.com/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `https://${posthogRegion}.i.posthog.com/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        /**
         * Security headers for the admin panel.
         *
         * - X-Frame-Options: DENY — prevents clickjacking. The admin panel
         *   can grant free memberships and issue refunds; a framed admin page
         *   is a social-engineering vector.
         * - X-Content-Type-Options: nosniff — prevents MIME-sniffing attacks.
         * - Referrer-Policy: same-origin — admin URLs (which may contain
         *   reader email addresses in query params) must not leak to external
         *   analytics or CDN logs.
         * - Content-Security-Policy: no external scripts. The admin panel
         *   does not load PostHog, Razorpay, or any third-party JS — an XSS
         *   on an admin session is the worst possible outcome.
         *
         * Note: these headers are applied to rendered HTML responses. The
         * proxy.ts session-cookie check fires first; requireEditor() /
         * requireAdmin() inside each page/action is the real auth boundary.
         */
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev hot-reload; tighten in prod if possible
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        /**
         * Reader-facing pages: allow the Razorpay Checkout JS and PostHog.
         *
         * checkout.razorpay.com/v1/checkout.js is loaded lazily (on Buy click)
         * so it does not add to the initial page weight. The frame-src entry
         * covers the Razorpay payment iframe that the modal injects.
         *
         * This header does NOT apply to /admin/* (matched first above).
         */
        source: "/((?!admin).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              // PostHog ingestion is proxied through /ingest so connect-src
              // only needs 'self'. Razorpay API calls go to api.razorpay.com.
              "connect-src 'self' https://api.razorpay.com",
              "frame-src https://api.razorpay.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
