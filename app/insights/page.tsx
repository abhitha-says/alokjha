import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import Reveal from "@/components/Reveal";
import { CATEGORY_META, getAllInsights, type Category } from "@/lib/markdown-content";

export const metadata = {
  title: "Insights — Human Signals",
  description:
    "Human Signals Insights: 55 short, evidence-led reads across Mind, Choice, Money, Business and AI + Human, each a standalone ₹499 product.",
};

const SERIES_ORDER: Category[] = ["Mind", "Choice", "Money", "Business", "AI + Human"];

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
    body: "End with leave points: a handful of ideas worth remembering after the PDF is closed.",
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

const PRICING = [
  { product: "Any one Human Signals Insight", price: "₹499" },
  { product: "Founding Five bundle (HSI 001–005)", price: "₹1,999" },
  { product: "Any 3 Insights", price: "₹1,199" },
  { product: "Any 5 Insights", price: "₹1,999" },
] as const;

export default function InsightsPage() {
  const insights = getAllInsights();

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Human Signals Insights · HSI 001–055
          </p>
          <h1 className="mt-3 max-w-[620px] font-serif text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            55 short, evidence-led reads on how people think, choose, spend, work and trust machines.
          </h1>
          <p className="mt-4 max-w-[600px] text-[14.5px] leading-relaxed text-muted">
            Each Insight is a standalone, 15-page reader product built from research, real-life
            examples, a practical framework, a self-audit and references — priced at ₹499. Five of
            them, the Founding Five, are free to read in full as Human Signals Reports.
          </p>
          <p className="mt-4 max-w-[600px] text-[12.5px] leading-relaxed text-muted">
            Human Signals Insights are educational publications. They are not clinical, therapeutic,
            medical, legal or personalised financial advice.
          </p>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                How a reader uses a Human Signals Insight
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

        <section className="border-t border-line bg-cream/50">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">Pricing at a glance</h2>
              <p className="mt-2 max-w-[520px] text-[13px] text-muted">
                Bundle prices are suggested commercial placeholders and can be revised before launch.
              </p>
            </Reveal>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {PRICING.map((row) => (
                <div key={row.product} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-[14px] text-ink">{row.product}</span>
                  <span className="shrink-0 font-serif text-[15px] font-semibold text-ink">
                    {row.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {SERIES_ORDER.map((series, seriesIndex) => {
          const seriesInsights = insights
            .filter((i) => i.series === series)
            .sort((a, b) => a.number.localeCompare(b.number));
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
                  {seriesInsights.map((insight) => (
                    <div
                      key={insight.number}
                      id={`hsi-${insight.number}`}
                      className="flex scroll-mt-24 flex-col gap-2 py-6 sm:flex-row sm:items-start sm:gap-8"
                    >
                      <span className="shrink-0 font-serif text-[13px] text-muted">
                        {insight.code}
                      </span>
                      <span className="flex-1">
                        <span className="block font-serif text-[18px] font-semibold leading-snug text-ink">
                          {insight.title}
                        </span>
                        <span className="mt-1.5 block max-w-[540px] text-[13.5px] leading-relaxed text-muted">
                          {insight.subtitle}
                        </span>
                        {!insight.isFounding && (
                          <span className="mt-2 block max-w-[540px] text-[12.5px] italic leading-relaxed text-muted/80">
                            &ldquo;{insight.teaser}&rdquo;
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                        {insight.isFounding ? (
                          <>
                            <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/70">
                              Free report
                            </span>
                            <Link
                              href={`/reports/${insight.reportSlug}`}
                              className="group inline-flex items-center gap-1 text-[13px] font-medium text-ink"
                            >
                              Read free
                              <span
                                className="transition-transform duration-300 group-hover:translate-x-1"
                                aria-hidden
                              >
                                →
                              </span>
                            </Link>
                          </>
                        ) : (
                          <>
                            <span className="font-serif text-[14px] font-semibold text-ink">
                              ₹499
                            </span>
                            <span className="rounded-full bg-ink px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-paper">
                              Coming soon
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section className="border-t border-line bg-cream/50">
          <div className="mx-auto max-w-content px-6 py-14 text-center sm:px-10 lg:px-14">
            <Reveal>
              <span className="rounded-full bg-ink px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-paper">
                Coming soon
              </span>
              <h2 className="mt-4 font-serif text-[20px] font-semibold text-ink">
                Individual Insights are being designed for release
              </h2>
              <p className="mx-auto mt-2 max-w-[420px] text-[13.5px] leading-relaxed text-muted">
                Subscribe to Human Signals and hear first when each Insight and its bundle pricing
                goes live — free, like everything else here.
              </p>
            </Reveal>
          </div>
        </section>

        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
