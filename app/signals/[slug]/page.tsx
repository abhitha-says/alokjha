// Render on demand — the DB-backed 'use cache' in lib/db-content.ts serves
// subsequent hits from cache, so cold latency is only paid once.
// (No generateStaticParams: route is dynamic by default.)
export const instant = false;


import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarkdownBody from "@/components/MarkdownBody";
import TrackEvent from "@/components/analytics/TrackEvent";
import TrackReadCompletion from "@/components/analytics/TrackReadCompletion";
import {
  getEssayBySlug,
  getRelatedEssays,
  getSourcesForCategory,
  getDeepDivesBySeries,
  CATEGORY_SLUGS,
} from "@/lib/source";
import { featuredSignalSlugs } from "@/lib/content";
import { isFreeDeepDive, PRICING } from "@/lib/access";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const signal = await getEssayBySlug(slug);
  if (!signal) return {};
  return {
    title: `${signal.title} — Human Signals`,
    description: signal.deck,
  };
}

export default async function SignalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const signal = await getEssayBySlug(slug);
  if (!signal) notFound();

  const [related, sources, seriesDives] = await Promise.all([
    getRelatedEssays(signal, 3),
    getSourcesForCategory(signal.category),
    getDeepDivesBySeries(signal.category),
  ]);
  const curatedImage = featuredSignalSlugs.find((e) => e.slug === signal.slug)?.image;
  const companionDive = seriesDives[0];

  return (
    <>
      <TrackEvent
        event="signal_viewed"
        properties={{
          slug: signal.slug,
          title: signal.title,
          category: signal.category,
          reading_time: signal.readingTime,
        }}
      />
      <Header />
      <main>
        <article className="mx-auto max-w-[720px] px-6 py-14 sm:px-8 md:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/signals?category=${CATEGORY_SLUGS[signal.category]}`}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent hover:text-ink"
            >
              {signal.category}
            </Link>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/70">
              Free Signal
            </span>
          </div>
          <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            {signal.title}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink/70 sm:text-[18px]">
            {signal.deck}
          </p>

          {curatedImage && (
            <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-md">
              <Image
                src={curatedImage}
                alt={signal.title}
                fill
                sizes="(max-width: 768px) 100vw, 720px"
                className="object-cover"
              />
            </div>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-5 text-left">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Author
              </p>
              <p className="mt-1 text-[13.5px] text-ink">Alok Jha</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Reading
              </p>
              <p className="mt-1 text-[13.5px] text-ink">{signal.readingTime}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Category
              </p>
              <p className="mt-1 text-[13.5px] text-ink">{signal.category}</p>
            </div>
          </div>

          <div className="mt-2">
            <MarkdownBody>{signal.body}</MarkdownBody>
          </div>

          {/* Sits immediately after the body, so "read to the end" means the
              end of the essay rather than the end of the page furniture. */}
          <TrackReadCompletion slug={signal.slug} category={signal.category} />

          {sources && (
            <div className="mt-12 border-t border-line pt-6">
              <h2 className="font-serif text-[16px] font-semibold text-ink">
                Selected research anchors &amp; further reading
              </h2>
              <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-ink">
                <MarkdownBody>{sources}</MarkdownBody>
              </div>
            </div>
          )}

          <div className="mt-14 rounded-lg bg-cream px-6 py-8 text-center sm:px-10">
            <h2 className="font-serif text-[20px] font-semibold text-ink">
              Join Human Signals
            </h2>
            <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] text-muted">
              One Signal every week, free by email. Deep Dives go further on one
              question at a time — {PRICING.deepDive.label} each, or every one of
              them with a membership.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Subscribe free →
              </Link>
              <Link
                href="/membership"
                className="inline-flex items-center rounded-full border border-ink/25 px-6 py-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper"
              >
                See membership
              </Link>
            </div>
          </div>

          {companionDive && (
            <div className="mt-10 border-t border-line pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Go deeper on {signal.category}
              </p>
              <Link href={`/deep-dives/${companionDive.slug}`} className="group mt-2 block">
                <h3 className="font-serif text-[17px] font-semibold text-ink group-hover:text-accent">
                  {companionDive.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  {companionDive.subtitle}
                </p>
                <span className="mt-2 inline-block text-[12.5px] font-medium text-ink">
                  {isFreeDeepDive(companionDive.slug)
                    ? "Read this Deep Dive free →"
                    : `Read the opening, then ${PRICING.deepDive.label} to continue →`}
                </span>
              </Link>
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="border-t border-line bg-cream/50">
            <div className="mx-auto max-w-content px-6 py-14 sm:px-10 lg:px-14">
              <h2 className="font-serif text-[20px] font-semibold text-ink">
                More in {signal.category}
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
                {related.map((r) => (
                  <Link key={r.slug} href={`/signals/${r.slug}`} className="group block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {r.readingTime}
                    </p>
                    <h3 className="mt-1.5 font-serif text-[16.5px] font-semibold leading-snug text-ink">
                      {r.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                      {r.deck}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink">
                      Read the Signal
                      <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                        →
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
