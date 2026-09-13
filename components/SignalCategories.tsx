import Image from "next/image";
import Link from "next/link";
import { categories } from "@/lib/content";
import Reveal from "./Reveal";

export default function SignalCategories() {
  return (
    <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <Reveal>
          <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">
            Explore Human Signals
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-[13px] text-muted">
            Five ways to look at the same human story.
          </p>
        </Reveal>
      </div>

      <div className="mt-7 flex gap-2.5 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
        {categories.map((cat, i) => (
          <Reveal key={cat.title} delay={i * 0.08} className="w-[68%] shrink-0 sm:w-auto">
            <Link
              href={cat.href}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-lg sm:aspect-square"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                sizes="(max-width: 640px) 68vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 transition-opacity duration-500 group-hover:from-black/90" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-serif text-[19px] font-semibold text-white">
                  {cat.title}
                </h3>
                <p className="mt-1 text-[12.5px] leading-snug text-white/80">
                  {cat.description}
                </p>
                <span className="mt-2 inline-block text-white/90 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
