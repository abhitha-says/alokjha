/**
 * One place that knows which PostHog region this project talks to.
 *
 * The region is chosen once, when the project is created, and cannot be
 * changed afterwards without migrating the data — so it lives in an env var
 * rather than being spread across the client init, the server client and the
 * `next.config.mjs` rewrites as three hardcoded hostnames that can drift.
 *
 * `next.config.mjs` cannot import this file (it is ESM JavaScript, this is
 * TypeScript), so it repeats the same two-line derivation. Keep them in step.
 */

export type PostHogRegion = "us" | "eu";

export const POSTHOG_REGION: PostHogRegion =
  process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "eu" : "us";

/** Ingestion endpoint. Only the server talks to this directly. */
export const POSTHOG_API_HOST = `https://${POSTHOG_REGION}.i.posthog.com`;

/** The dashboard. Used by posthog-js to build "view in PostHog" links. */
export const POSTHOG_UI_HOST = `https://${POSTHOG_REGION}.posthog.com`;

/**
 * The browser never calls PostHog directly. It calls this same-origin path,
 * which `next.config.mjs` rewrites to `POSTHOG_API_HOST`.
 *
 * Without this, uBlock Origin, Brave and every "block trackers" toggle drop
 * the request, and roughly a third of the audience becomes invisible. Since
 * they are disproportionately the technical, high-intent readers, the loss is
 * not evenly distributed and skews the funnel rather than just shrinking it.
 */
export const POSTHOG_PROXY_PATH = "/ingest";

/** The public project key. Write-only ingestion — safe in the bundle. */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * Analytics is strictly optional. With no key configured every capture in the
 * codebase becomes a no-op and nothing throws, so the site runs unchanged for
 * a contributor who has not set up a PostHog project.
 */
export const ANALYTICS_ENABLED = Boolean(POSTHOG_KEY);
