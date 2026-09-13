import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[560px] w-full md:h-auto md:min-h-[400px] md:aspect-[2159/728]">
        <Image
          src="/images/hero-overlook.jpg"
          alt="Alok Jha sits on a rock overlooking misty mountains at sunset, with the quote: Better decisions create a kinder, more fulfilling world."
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_center] md:object-[90%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f4ede2] via-[#f4ede2]/65 to-transparent md:from-[#f4ede2]/90 md:via-[#f0e8db]/25 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent md:hidden" />

        <div className="relative mx-auto flex h-full max-w-content flex-col justify-center px-6 sm:px-10 lg:px-14">
          <p className="reveal text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70 [animation-delay:0ms]">
            Ideas for a more human tomorrow
          </p>
          <h1 className="reveal mt-3 max-w-[520px] font-serif text-[34px] font-semibold leading-[1.12] tracking-tight text-ink sm:text-[42px] md:text-[46px] [animation-delay:100ms]">
            Because people are
            <br />
            more than data.
          </h1>
          <p className="reveal mt-4 max-w-[440px] text-[14.5px] leading-relaxed text-ink/75 sm:text-[15px] [animation-delay:200ms]">
            Essays, research and practical ideas on how we think, choose
            and behave — in work, in life and in a rapidly changing world.
          </p>
          <div className="reveal mt-6 flex flex-wrap items-center gap-3 [animation-delay:300ms]">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Explore Essays <span aria-hidden>→</span>
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center rounded-full border border-ink/25 bg-white/40 px-6 py-3 text-[13.5px] font-medium text-ink backdrop-blur-sm transition-colors hover:bg-white/70"
            >
              Get the Free Reports
            </Link>
          </div>

          <div className="reveal mt-8 max-w-[240px] text-left md:hidden [animation-delay:400ms]">
            <p className="font-hand text-[20px] italic leading-[1.25] text-ink/70">
              &ldquo;Better decisions create a kinder, more fulfilling world.&rdquo;
            </p>
            <p className="mt-1.5 font-hand text-[16px] text-ink/55">— Alok Jha</p>
          </div>
        </div>
      </div>
    </section>
  );
}
