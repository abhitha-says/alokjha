import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import Reveal from "@/components/Reveal";
import {
  CATEGORY_META,
  CATEGORY_SLUGS,
  getAllDeepDives,
  type Category,
} from "@/lib/source";
import {
  getEntitlements,
  resolveDeepDiveAccess,
  isFreeDeepDive,
  PRICING,
} from "@/lib/access";

// Reads auth session (cookies) — always rendered at request time.
export const instant = false;

export const metadata = {
  title: "Deep Dives — Human Signals",
  description:
    "Fifty-five Deep Dives across Mind, Choice, Money, Business and AI + Human. Read the opening of any of them free, buy one for ₹299, or unlock every one with a membership.",
};

const SERIES_ORDER: Category[] = ["Mind", "Choice", "Money", "Business", "AI + Human"];

function categoryFromParam(value?: string): Category | null {
  if (!value) return null;
  return (
    SERIES_ORDER.find(
      (c) => CATEGORY_SLUGS[c].toLowerCase() === value.toLowerCase()
    ) ?? null
  );
}

const READER_STEPS = [
  {
    step: "Read",
    body: "Start with the human moment and the central tension. The aim is recognition before explanation.",
  },
  {
    step: "Understand",
    body: "Use the evidence and examples to see what psychological process may be operating.",
  },
  {
    step: "Notice",
    body: "Use the self-audit and reflection questions to locate the pattern in your own life.",
  },
  {
    step: "Experiment",
    body: "Try the small behavioural experiment. No dramatic overhaul is required.",
  },
  {
    step: "Carry forward",
    body: "End with leave points: a handful of ideas worth remembering afterwards.",
  },
] as const;

const EDITORIAL_STANDARD = [
  "Human-first opening, not textbook exposition",
  "Research and data woven into the narrative",
  "Relatable work, family and everyday examples",
  "No diagnostic or treatment claims",
  "Practical reflection without generic self-help",
  "Clear source page and educational disclaimer",
] as const;

export default async function DeepDivesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const dives = await getAllDeepDives();
  const entitlements = await getEntitlements();
  const activeCategory = categoryFromParam(category);
  const seriesToShow = activeCategory ? [activeCategory] : SERIES_ORDER;
  const freeCount = dives.filter((d) => isFreeDeepDive(d.slug)).length;

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Deep Dives · {dives.length} editions
          </p>
          <h1 className="mt-3 max-w-[620px] font-serif text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            One question, worked all the way through.
          </h1>
          <p className="mt-4 max-w-[600px] text-[14.5px] leading-relaxed text-muted">
            Where a Signal opens a question, a Deep Dive answers it. Each one is
            a standalone edition built from research, real-life examples, a
            practical framework, a self-audit and references.
          </p>

          <div className="mt-7 max-w-[620px] rounded-lg border border-line bg-cream/60 px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              What you can read, and what costs what
            </p>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink/80">
              <li>
                <span className="font-medium text-ink">Free for everyone —</span>{" "}
                the introduction and roughly the first fifth of every Deep Dive,
                plus {freeCount} complete editions released free.
              </li>
              <li>
                <span className="font-medium text-ink">
                  {PRICING.deepDive.label} —
                </span>{" "}
                complete online access to one Deep Dive, permanently, through
                your account.
              </li>
              <li>
                <span className="font-medium text-ink">
                  {PRICING.annual.label}/year —
                </span>{" "}
                every Deep Dive here, every new one published while your
                membership is active, and the quarterly member conversations.
              </li>
            </ul>
            <Link
              href="/membership"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-ink"
            >
              Compare everything on the membership page →
            </Link>
          </div>

          <p className="mt-6 max-w-[600px] text-[12.5px] leading-relaxed text-muted">
            Deep Dives are educational publications. They are not clinical,
            therapeutic, medical, legal or personalised financial advice.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/deep-dives"
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                !activeCategory
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink/70 hover:border-ink/40"
              }`}
            >
              All Deep Dives
            </Link>
            {SERIES_ORDER.map((series) => (
              <Link
                key={series}
                href={`/deep-dives?category=${CATEGORY_SLUGS[series]}`}
                className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  activeCategory === series
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink/70 hover:border-ink/40"
                }`}
              >
                {series} Deep Dives
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                How a reader uses a Deep Dive
              </h2>
            </Reveal>
            <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
              {READER_STEPS.map((s, i) => (
                <Reveal key={s.step} delay={i * 0.07}>
                  <div className="border-t border-line pt-4">
                    <h3 className="font-serif text-[17px] font-semibold leading-snug text-ink">
                      {s.step}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.1}>
              <h3 className="mt-12 font-serif text-[16px] font-semibold text-ink">
                Editorial standard
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-[13.5px] leading-relaxed text-muted sm:grid-cols-2">
                {EDITORIAL_STANDARD.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span aria-hidden className="text-accent">
                      •
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {seriesToShow.map((series, seriesIndex) => {
          const seriesDives = dives.filter((d) => d.series === series);
          const meta = CATEGORY_META[series];

          return (
            <section key={series} className={seriesIndex === 0 ? "border-t border-line" : ""}>
              <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
                <Reveal>
                  <h2 className="font-serif text-[24px] font-semibold text-ink">
                    {series} Series
                  </h2>
                  <p className="mt-2 max-w-[520px] text-[13px] text-muted">{meta.description}</p>
                </Reveal>

                <div className="mt-8 divide-y divide-line border-t border-line">
                  {seriesDives.map((dive) => {
                    const access = resolveDeepDiveAccess(dive.slug, entitlements);
                    return (
                      <div
                        key={dive.number}
                        className="flex flex-col gap-2 py-6 sm:flex-row sm:items-start sm:gap-8"
                      >
                        <span className="shrink-0 font-serif text-[13px] text-muted">
                          {dive.code}
                        </span>
                        <span className="flex-1">
                          <span className="block font-serif text-[18px] font-semibold leading-snug text-ink">
                            {dive.title}
                          </span>
                          <span className="mt-1.5 block max-w-[540px] text-[13.5px] leading-relaxed text-muted">
                            {dive.subtitle}
                          </span>
                          {!dive.isFounding && dive.teaser && (
                            <span className="mt-2 block max-w-[540px] text-[12.5px] italic leading-relaxed text-muted/80">
                              &ldquo;{dive.teaser}&rdquo;
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <AccessBadge reason={access.reason} />
                          <Link
                            href={`/deep-dives/${dive.slug}`}
                            className="group inline-flex items-center gap-1 text-[13px] font-medium text-ink"
                          >
                            {access.granted ? "Read in full" : "Read the opening"}
                            <span
                              className="transition-transform duration-300 group-hover:translate-x-1"
                              aria-hidden
                            >
                              →
                            </span>
                          </Link>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        <Newsletter />
      </main>
      <Footer />
    </>
  );
}

function AccessBadge({ reason }: { reason: "free-edition" | "membership" | "purchased" | "locked" }) {
  const copy: Record<typeof reason, string> = {
    "free-edition": "Free edition",
    membership: "In your membership",
    purchased: "You own this",
    locked: `${PRICING.deepDive.label} or membership`,
  };

  return (
    <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/70">
      {copy[reason]}
    </span>
  );
}
