import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarkdownBody from "@/components/MarkdownBody";
import {
  getAllEssays,
  getEssayBySlug,
  getRelatedEssays,
  getSourcesForCategory,
  CATEGORY_SLUGS,
} from "@/lib/markdown-content";
import { featuredEssaySlugs } from "@/lib/content";

export function generateStaticParams() {
  return getAllEssays().map((essay) => ({ slug: essay.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const essay = getEssayBySlug(slug);
  if (!essay) return {};
  return {
    title: `${essay.title} — Human Signals`,
    description: essay.deck,
  };
}

export default async function EssayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const essay = getEssayBySlug(slug);
  if (!essay) notFound();

  const related = getRelatedEssays(essay, 3);
  const sources = getSourcesForCategory(essay.category);
  const curatedImage = featuredEssaySlugs.find((e) => e.slug === essay.slug)?.image;

  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-[720px] px-6 py-14 sm:px-8 md:py-20">
          <Link
            href={`/articles?category=${CATEGORY_SLUGS[essay.category]}`}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent hover:text-ink"
          >
            {essay.category}
          </Link>
          <h1 className="mt-3 break-words font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            {essay.title}
          </h1>
          <p className="mt-4 break-words text-[16px] leading-relaxed text-ink/70 sm:text-[18px]">
            {essay.deck}
          </p>

          {curatedImage && (
            <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-md">
              <Image
                src={curatedImage}
                alt={essay.title}
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
              <p className="mt-1 text-[13.5px] text-ink">{essay.readingTime}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Category
              </p>
              <p className="mt-1 text-[13.5px] text-ink">{essay.category}</p>
            </div>
          </div>

          <div className="mt-2">
            <MarkdownBody>{essay.body}</MarkdownBody>
          </div>

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
            <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] text-muted">
              One thoughtful exploration of human behaviour each week. Free.
            </p>
            <Link
              href="/subscribe"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Subscribe free →
            </Link>
          </div>
        </article>

        {related.length > 0 && (
          <section className="border-t border-line bg-cream/50">
            <div className="mx-auto max-w-content px-6 py-14 sm:px-10 lg:px-14">
              <h2 className="font-serif text-[20px] font-semibold text-ink">
                More in {essay.category}
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
                {related.map((r) => (
                  <Link key={r.slug} href={`/essays/${r.slug}`} className="group block">
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
                      Read the essay
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
