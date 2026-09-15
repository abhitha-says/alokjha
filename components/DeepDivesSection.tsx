import Link from "next/link";
import { getAllDeepDives } from "@/lib/source";
import { isFreeDeepDive, PRICING } from "@/lib/access";
import Reveal from "./Reveal";

export default async function DeepDivesSection() {
  const all = await getAllDeepDives();
  const free = all.filter((d) => isFreeDeepDive(d.slug));
  const paid = all.filter((d) => !isFreeDeepDive(d.slug)).slice(0, 4);
  const shown = [...free, ...paid];

  return (
    <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <Reveal className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">
            Human Signals Deep Dives
          </h2>
          <p className="text-[13px] text-muted">
            One question, worked all the way through.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            href="/deep-dives"
            className="whitespace-nowrap text-[13px] font-medium text-accent transition-colors hover:text-ink"
          >
            View all {all.length} Deep Dives →
          </Link>
        </Reveal>
      </div>

      <Reveal delay={0.06}>
        <p className="mt-3 max-w-[620px] text-[13.5px] leading-relaxed text-muted">
          Read the opening of any Deep Dive free. {free.length} are free in full.
          The rest are {PRICING.deepDive.label} each, or all of them with a
          membership from {PRICING.monthly.label} a month.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-7">
        <div className="group/marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="flex w-max animate-marquee gap-6 group-hover/marquee:[animation-play-state:paused]">
            {[...shown, ...shown].map((dive, i) => {
              const duplicate = i >= shown.length;
              const isFree = isFreeDeepDive(dive.slug);
              return (
                <div
                  key={`${dive.slug}-${i}`}
                  aria-hidden={duplicate}
                  className="flex w-[260px] shrink-0 flex-col border-t border-line pt-4"
                >
                  <p className="text-[12px] font-semibold text-muted">{dive.code}</p>
                  <h3 className="mt-2 font-serif text-[17px] font-semibold leading-snug text-ink">
                    {dive.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted">
                    {dive.subtitle}
                  </p>
                  <span className="mt-3 inline-block w-fit rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/70">
                    {isFree ? "Free edition" : `${PRICING.deepDive.label} or membership`}
                  </span>
                  <Link
                    href={`/deep-dives/${dive.slug}`}
                    tabIndex={duplicate ? -1 : 0}
                    className="group mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink"
                  >
                    {isFree ? "Read free" : "Read the opening"}
                    <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
