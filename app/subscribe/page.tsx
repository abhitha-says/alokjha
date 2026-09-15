import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SubscribeForm from "@/components/SubscribeForm";
import { PRICING, FREE_DEEP_DIVE_SLUGS } from "@/lib/access";

// Reads searchParams for confirm/unsubscribe state — rendered at request time.
export const instant = false;


export const metadata = {
  title: "Subscribe — Human Signals",
  description:
    "One Signal every week, free by email. Plus the free Deep Dive editions and word when a new Deep Dive is published.",
};

const INCLUDED = [
  "The weekly Signal, delivered by email",
  "Access to every Signal on the site",
  "Selected complete Deep Dives, released free",
  "Notification when a new Deep Dive is published",
  "An invitation to become a member — never an obligation",
] as const;

/**
 * The confirm and unsubscribe routes redirect back here with a query flag.
 * Without a message for each, a reader who clicks the link in their email
 * lands on the signup form again and has no idea whether it worked.
 */
const NOTICES = {
  "confirm=ok": {
    tone: "good",
    text: "You're confirmed. The next Signal will arrive on schedule, and nothing else will.",
  },
  "confirm=invalid": {
    tone: "bad",
    text: "That confirmation link has expired or has already been used. Enter your address below and we'll send a fresh one.",
  },
  "unsubscribe=ok": {
    tone: "good",
    text: "You've been unsubscribed. No further emails will be sent. Every Signal stays free to read here.",
  },
  "unsubscribe=invalid": {
    tone: "bad",
    text: "That unsubscribe link is not valid. Reply to any Signal and we'll remove you by hand.",
  },
} as const;

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string; unsubscribe?: string }>;
}) {
  const params = await searchParams;
  const key = params.confirm
    ? (`confirm=${params.confirm}` as const)
    : params.unsubscribe
      ? (`unsubscribe=${params.unsubscribe}` as const)
      : null;
  const notice = key && key in NOTICES ? NOTICES[key as keyof typeof NOTICES] : null;

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Subscribe · Free
          </p>
          <h1 className="mt-3 max-w-[600px] font-serif text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            One thoughtful exploration of human behaviour each week.
          </h1>
          <p className="mt-4 max-w-[560px] text-[14.5px] leading-relaxed text-muted">
            No spam, no paywall, no account required to read. Subscribing is
            simply the easiest way to have the Signal reach you.
          </p>

          {notice && (
            <p
              role="status"
              className={`mt-6 max-w-[560px] rounded-lg border px-5 py-4 text-[14px] leading-relaxed ${
                notice.tone === "good"
                  ? "border-line bg-cream text-ink"
                  : "border-accent/30 bg-accent/5 text-ink"
              }`}
            >
              {notice.text}
            </p>
          )}

          <div className="mt-8">
            <SubscribeForm />
          </div>

          <p className="mt-4 max-w-[460px] text-[12.5px] leading-relaxed text-muted">
            You can read every Signal on this site without subscribing and
            without registering. Unsubscribe whenever you like.
          </p>
        </section>

        <section className="border-t border-line bg-cream/50">
          <div className="mx-auto grid max-w-content grid-cols-1 gap-10 px-6 py-14 sm:px-10 md:grid-cols-2 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                What a free subscription includes
              </h2>
              <ul className="mt-5 space-y-2.5 text-[14px] leading-relaxed text-ink/80">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="text-accent">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                Where membership comes in
              </h2>
              <div className="mt-5 space-y-3 text-[14px] leading-relaxed text-ink/80">
                <p>
                  A free subscription is not a trial and not a cut-down version
                  of anything paid. The Signals are the publication.
                </p>
                <p>
                  Deep Dives are the longer work: one question, taken all the way
                  through, with the research, a framework, a self-audit and
                  sources. {FREE_DEEP_DIVE_SLUGS.length} of them are free to read
                  in full. The rest are {PRICING.deepDive.label} each, or
                  included with a membership from {PRICING.monthly.label} a
                  month.
                </p>
                <Link
                  href="/membership"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent hover:text-ink"
                >
                  See what membership unlocks →
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 text-center sm:px-10 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[20px] font-semibold text-ink">
                Start reading first, if you prefer
              </h2>
              <p className="mx-auto mt-2 max-w-[420px] text-[13.5px] leading-relaxed text-muted">
                Nothing here asks you to sign up before you have read anything.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/signals"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-6 py-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-cream"
                >
                  Read the Signals
                </Link>
                <Link
                  href="/deep-dives"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-6 py-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-cream"
                >
                  Browse the Deep Dives
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
