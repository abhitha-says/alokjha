/**
 * The Human Signals event taxonomy.
 *
 * Every analytics event in the codebase is declared here and nowhere else.
 * Call sites reference the key, never a string literal, so an event cannot be
 * renamed in one place and left behind in another — the type checker catches
 * `signal_read` vs `signalRead` vs `read-signal` before it reaches PostHog,
 * where the only fix is a manual merge of two funnels.
 *
 * Naming: snake_case, `noun_verb` in the past tense. Properties are snake_case
 * too, and money is always `amount_inr` in whole rupees.
 *
 * Nothing in this file imports PostHog, so it is safe to import from a server
 * component, a client component or a route handler.
 */

export interface AnalyticsEvents {
  /* ---------------------------------------------------------- Reading --- */

  signal_viewed: {
    slug: string;
    title: string;
    category: string;
    reading_time: string;
  };

  /** Fired once, when a reader reaches the end of a Signal. */
  signal_completed: {
    slug: string;
    category: string;
    dwell_seconds: number;
  };

  /** A Deep Dive opened by a reader who is not entitled to the whole thing. */
  deep_dive_preview_viewed: {
    slug: string;
    series: string;
    is_founding: boolean;
    preview_words: number;
    total_words: number;
  };

  /** A Deep Dive opened by a reader who is entitled to it. */
  deep_dive_full_viewed: {
    slug: string;
    series: string;
    is_founding: boolean;
    /** Why they were let in: free-edition | membership | purchased. */
    access_reason: string;
  };

  /* ---------------------------------------------------------- Paywall --- */

  /** The boundary was rendered. The denominator of every conversion rate. */
  paywall_hit: {
    slug: string;
    series: string;
    preview_share: number;
  };

  paywall_cta_clicked: {
    slug: string;
    series: string;
    cta: "buy-single" | "membership" | "sign-in";
  };

  /* ------------------------------------------------------- Newsletter --- */

  newsletter_subscribed: {
    source_page: string;
  };

  newsletter_confirmed: {
    source_page: string;
  };

  /* --------------------------------------------------------- Commerce ---
   *
   * These are captured on the server, from the Razorpay webhook, once Phase 4
   * lands. A browser-side purchase event is blocked by ad blockers, lost when
   * the reader closes the tab on the success redirect, and forgeable by anyone
   * with a console. Revenue has to come from a source we control.
   */

  checkout_started: {
    product: "deep-dive" | "monthly" | "annual" | "founding";
    slug?: string;
    amount_inr: number;
  };

  checkout_succeeded: {
    product: "deep-dive" | "monthly" | "annual" | "founding";
    slug?: string;
    amount_inr: number;
    payment_id: string;
  };

  checkout_failed: {
    product: "deep-dive" | "monthly" | "annual" | "founding";
    slug?: string;
    reason: string;
  };

  /**
   * Recurring subscription lifecycle events.
   * Fired server-side from the Razorpay webhook.
   */
  subscription_renewed: {
    plan: "monthly" | "annual";
    amount_inr: number;
  };

  subscription_cancelled: {
    plan: "monthly" | "annual";
  };

  subscription_payment_failed: {
    plan: "monthly" | "annual";
    /** grace_until ISO string — when access lapses if not recovered. */
    grace_until: string;
  };

  /* ----------------------------------------------------------- Search --- */

  search_performed: {
    /** The query itself is deliberately not sent — see the note below. */
    query_length: number;
    result_count: number;
  };
}

export type AnalyticsEvent = keyof AnalyticsEvents;

export type AnalyticsProperties<E extends AnalyticsEvent> = AnalyticsEvents[E];

/**
 * Search queries are personal. People type things into a psychology site's
 * search box that they would not say aloud, and a raw query log tied to a
 * distinct ID is a liability with no matching analytical value — the length
 * and the result count answer "is search working?" on their own.
 */
export const SEARCH_QUERY_IS_NOT_CAPTURED = true;
