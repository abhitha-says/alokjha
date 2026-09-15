import { PRICING, UPGRADE_CREDIT_DAYS, PREVIEW_SHARE } from "@/lib/access";
import TrackEvent from "@/components/analytics/TrackEvent";
import TrackedLink from "@/components/analytics/TrackedLink";

/**
 * The access choice shown at the end of a locked Deep Dive preview.
 *
 * This is a boundary, not an overlay: the remainder of the article was never
 * sent to the browser, so there is nothing behind this block to reveal.
 *
 * `paywall_hit` is captured here rather than in the page, so the event cannot
 * drift away from the thing it claims to measure — if this component renders,
 * a reader met the boundary, and there is no branch in which one happens
 * without the other.
 */
export default function Paywall({
  title,
  themes,
  slug,
  series,
}: {
  title: string;
  themes: string[];
  slug: string;
  series: string;
}) {
  return (
    <section
      aria-labelledby="continue-reading"
      className="mt-12 border-t border-line pt-10"
    >
      <TrackEvent
        event="paywall_hit"
        properties={{ slug, series, preview_share: PREVIEW_SHARE }}
      />
      {themes.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-[16px] font-semibold text-ink">
            What the rest of this Deep Dive works through
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {themes.map((theme) => (
              <li
                key={theme}
                className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink/75"
              >
                <span aria-hidden className="text-accent">
                  —
                </span>
                {theme}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg bg-cream px-6 py-9 sm:px-10">
        <h2
          id="continue-reading"
          className="font-serif text-[24px] font-semibold text-ink sm:text-[26px]"
        >
          Continue reading
        </h2>
        <p className="mt-2 max-w-[460px] text-[14px] leading-relaxed text-muted">
          You have read the opening of {title}. The rest is available to buy on
          its own, or with every other Deep Dive as part of a membership.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-line bg-paper p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              This Deep Dive
            </p>
            <p className="mt-2 font-serif text-[26px] font-semibold leading-none text-ink">
              {PRICING.deepDive.label}
            </p>
            <ul className="mt-4 flex-1 space-y-1.5 text-[13px] leading-relaxed text-muted">
              <li>Complete online access to this Deep Dive</li>
              <li>Permanent access through your Human Signals account</li>
              <li>
                {PRICING.deepDive.label} credited if you become a member within{" "}
                {UPGRADE_CREDIT_DAYS} days
              </li>
            </ul>
            <TrackedLink
              href="/membership#one-deep-dive"
              event="paywall_cta_clicked"
              properties={{ slug, series, cta: "buy-single" }}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-ink/25 px-5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-cream"
            >
              Buy this Deep Dive for {PRICING.deepDive.label}
            </TrackedLink>
          </div>

          <div className="flex flex-col rounded-lg border border-ink/20 bg-paper p-5 ring-1 ring-ink/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
              Recommended · Annual membership
            </p>
            <p className="mt-2 font-serif text-[26px] font-semibold leading-none text-ink">
              {PRICING.annual.label}
              <span className="ml-1 text-[14px] font-normal text-muted">/year</span>
            </p>
            <ul className="mt-4 flex-1 space-y-1.5 text-[13px] leading-relaxed text-muted">
              <li>Every Deep Dive, including this one</li>
              <li>Every new Deep Dive while the membership is active</li>
              <li>The complete members&rsquo; archive</li>
              <li>Quarterly online member conversations</li>
            </ul>
            <TrackedLink
              href="/membership#annual"
              event="paywall_cta_clicked"
              properties={{ slug, series, cta: "membership" }}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Unlock every Deep Dive →
            </TrackedLink>
          </div>
        </div>

        <p className="mt-6 text-[13px] leading-relaxed text-ink/70">
          Upgrade within {UPGRADE_CREDIT_DAYS} days and your{" "}
          {PRICING.deepDive.label} purchase will be deducted from annual
          membership.
        </p>
        <p className="mt-3 text-[12.5px] text-muted">
          Already bought this, or already a member?{" "}
          <TrackedLink
            href="/account"
            event="paywall_cta_clicked"
            properties={{ slug, series, cta: "sign-in" }}
            className="text-accent underline underline-offset-2 hover:text-ink"
          >
            Sign in
          </TrackedLink>
          .
        </p>
      </div>
    </section>
  );
}
