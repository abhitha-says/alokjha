import Image from "next/image";
import Link from "next/link";
import { featuredEssaySlugs } from "@/lib/content";
import { getEssayBySlug } from "@/lib/markdown-content";
import Reveal from "./Reveal";

export default function FeaturedEssays() {
  const featuredEssays = featuredEssaySlugs
    .map(({ slug, image }) => {
      const essay = getEssayBySlug(slug);
      return essay ? { ...essay, image, href: `/essays/${slug}` } : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <Reveal>
          <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">
            Featured Essays
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="flex items-baseline gap-6">
          <p className="hidden text-[13px] text-muted sm:block">
            Latest thinking on people and behaviour.
          </p>
          <Link
            href="/articles"
            className="whitespace-nowrap text-[13px] font-medium text-accent transition-colors hover:text-ink"
          >
            View all essays →
          </Link>
        </Reveal>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {featuredEssays.map((essay, i) => (
          <Reveal key={essay.title} delay={i * 0.08}>
            <Link href={essay.href} className="group block">
              <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image
                  src={essay.image}
                  alt={essay.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {essay.category} · {essay.readingTime}
              </p>
              <h3 className="mt-1.5 font-serif text-[18px] font-semibold leading-snug text-ink">
                {essay.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                {essay.deck}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink">
                Read more
                <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
