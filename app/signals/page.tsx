import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  getAllEssays,
  CATEGORY_SLUGS,
  CATEGORY_META,
  type Category,
} from "@/lib/source";

const CATEGORIES: Category[] = ["Mind", "Choice", "Money", "Business", "AI + Human"];

function categoryFromParam(value?: string): Category | null {
  if (!value) return null;
  const match = CATEGORIES.find(
    (c) => CATEGORY_SLUGS[c].toLowerCase() === value.toLowerCase()
  );
  return match ?? null;
}

export const metadata = {
  title: "Signals — Human Signals",
  description:
    "Every weekly Signal, free to read and free to share. No account, no payment, no registration.",
};

// Reads searchParams for category filter — rendered at request time.
export const instant = false;

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const signals = await getAllEssays();
  const activeCategory = categoryFromParam(category);
  const categoriesToShow = activeCategory ? [activeCategory] : CATEGORIES;

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Signals · Free to read
          </p>
          <h1 className="mt-3 max-w-[560px] font-serif text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            One Signal a week on Mind, Choice, Money, Business and AI + Human
          </h1>
          <p className="mt-4 max-w-[560px] text-[14.5px] leading-relaxed text-muted">
            Written for curious non-specialists: people who want evidence
            without academic fog, practical implications without simplistic
            &ldquo;life hacks,&rdquo; and questions that remain useful after
            the page is closed.
          </p>
          <p className="mt-4 max-w-[560px] text-[13.5px] leading-relaxed text-ink/70">
            Every Signal is free. There is nothing to sign up for and nothing
            to pay before you read — read it here, or have it arrive by email
            each week.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/signals"
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                !activeCategory
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink/70 hover:border-ink/40"
              }`}
            >
              All Signals
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/signals?category=${CATEGORY_SLUGS[cat]}`}
                className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  activeCategory === cat
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink/70 hover:border-ink/40"
                }`}
              >
                {cat} Signals
              </Link>
            ))}
          </div>
        </section>

        {categoriesToShow.map((category) => {
          const items = signals.filter((e) => e.category === category);
          return (
            <section key={category} className="border-t border-line">
              <div className="mx-auto max-w-content px-6 py-12 sm:px-10 lg:px-14">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-[22px] font-semibold text-ink">
                    {category}
                  </h2>
                  <p className="text-[13px] text-muted">
                    {CATEGORY_META[category].description}
                  </p>
                </div>

                <ol className="mt-6 divide-y divide-line">
                  {items.map((signal) => (
                    <li key={signal.slug}>
                      <Link
                        href={`/signals/${signal.slug}`}
                        className="group flex items-start gap-4 py-5 sm:items-center"
                      >
                        <span className="w-7 shrink-0 font-serif text-[13px] text-muted">
                          {String(signal.number).padStart(2, "0")}
                        </span>
                        <span className="flex-1">
                          <span className="block font-serif text-[16.5px] font-semibold leading-snug text-ink group-hover:text-accent sm:text-[17.5px]">
                            {signal.title}
                          </span>
                          <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                            {signal.deck}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-[12px] font-medium uppercase tracking-[0.05em] text-muted sm:block">
                          {signal.readingTime}
                        </span>
                        <span
                          className="shrink-0 text-ink/60 transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}

        <section className="border-t border-line bg-cream/50">
          <div className="mx-auto max-w-content px-6 py-14 text-center sm:px-10 lg:px-14">
            <h2 className="font-serif text-[20px] font-semibold text-ink">
              Get the weekly Signal by email
            </h2>
            <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] text-muted">
              Free, and it stays free. You will also hear when a new Deep Dive
              is published.
            </p>
            <Link
              href="/subscribe"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Subscribe free →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
