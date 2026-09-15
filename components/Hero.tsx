import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[560px] w-full md:h-auto md:min-h-[400px] md:aspect-[2159/728]">
        {/* Art-directed hero: a portrait crop below md, the wide original from md
            up. Only one is in the DOM's a11y tree at a time (the other is
            display:none), so each keeps its own alt. The `1px` branch in each
            `sizes` makes the browser pick the smallest srcset candidate for the
            viewport where that image is hidden, so `priority` preloads only the
            one actually on screen instead of both heroes. */}
        <Image
          src="/images/hero-overlook-mobile.jpg"
          alt="Alok Jha sits on a rock at sunset, looking out over misty hills and a distant lake."
          fill
          priority
          sizes="(min-width: 768px) 1px, 100vw"
          className="object-cover object-center md:hidden"
        />
        <Image
          src="/images/hero-overlook.jpg"
          alt="Alok Jha sits on a rock overlooking misty mountains at sunset, with the quote: Better decisions create a kinder, more fulfilling world."
          fill
          priority
          sizes="(max-width: 767px) 1px, 100vw"
          className="hidden object-cover object-[90%_center] md:block"
        />
        {/* The old landscape shot had empty sky on the left, so a near-opaque
            cream wash cost nothing. This portrait frames the sun centre-right,
            so the mobile wash is lighter and the bottom scrim is cream rather
            than black — the handwritten quote sits over dark rock and needs the
            ground lightened, not darkened. md+ values are unchanged. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f4ede2]/92 via-[#f4ede2]/45 to-transparent md:from-[#f4ede2]/90 md:via-[#f0e8db]/25 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#f4ede2]/55 via-transparent to-transparent md:hidden" />

        {/* Top-aligned below md so the copy sits over open sky rather than the
            silhouette's head, which measured 1.5:1 behind the deck. Centred
            again from md up, where the wide crop puts the subject far right. */}
        <div className="relative mx-auto flex h-full max-w-content flex-col justify-start px-6 pt-11 sm:px-10 md:justify-center md:pt-0 lg:px-14">
          <p className="reveal text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70 [animation-delay:0ms]">
            Ideas for a more human tomorrow
          </p>
          {/* Fluid only below sm: at 34px "Because people are" needs 307px but a
              320px phone leaves 272px, which orphaned "are" onto its own line.
              Caps at the approved 34px from ~378px up, so sm/md are untouched. */}
          <h1 className="reveal mt-3 max-w-[520px] font-serif text-[clamp(28px,9vw,34px)] font-semibold leading-[1.12] tracking-tight text-ink sm:text-[42px] md:text-[46px] [animation-delay:100ms]">
            Because people are
            <br />
            more than data.
          </h1>
          <p className="reveal mt-4 max-w-[440px] text-[14.5px] leading-relaxed text-ink/75 sm:text-[15px] [animation-delay:200ms]">
            A free Signal every week on how we think, choose and behave.
            Deep Dives when one question deserves the whole answer.
          </p>
          <div className="reveal mt-6 flex flex-wrap items-center gap-3 [animation-delay:300ms]">
            <Link
              href="/signals"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Read the Signals <span aria-hidden>→</span>
            </Link>
            <Link
              href="/deep-dives"
              className="inline-flex items-center rounded-full border border-ink/25 bg-white/40 px-6 py-3 text-[13.5px] font-medium text-ink backdrop-blur-sm transition-colors hover:bg-white/70"
            >
              Explore Deep Dives
            </Link>
          </div>

        </div>
      </div>

      {/* On desktop this quote is part of the wide photo itself. The portrait
          crop has no clear space for it — it landed on the silhouette's torso,
          where measured contrast was ~1.9 against a 4.5 floor — so on mobile it
          runs under the photo as a caption instead of fighting it. */}
      <div className="mx-auto max-w-content px-6 pb-2 pt-7 sm:px-10 md:hidden">
        <p className="font-hand text-[21px] italic leading-[1.3] text-ink/75">
          &ldquo;Better decisions create a kinder, more fulfilling world.&rdquo;
        </p>
        <p className="mt-1 font-hand text-[16px] text-ink/55">— Alok Jha</p>
      </div>
    </section>
  );
}
