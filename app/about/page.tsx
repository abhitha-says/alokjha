import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "About — Human Signals",
  description:
    "Alok Jha is an entrepreneur, business strategist and mentor with more than three decades of CXO-level experience. Human Signals is his personal publication and research platform.",
};

const stats = [
  { value: "30+", label: "Years of experience" },
  { value: "50", label: "Essays published" },
  { value: "5", label: "Sections" },
  { value: "5", label: "Deep-dive reports" },
] as const;

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 pt-14 sm:px-10 md:pt-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            About Human Signals
          </p>

          <div className="mt-6 grid grid-cols-1 gap-10 md:mt-8 md:grid-cols-[280px_1fr] md:gap-14 lg:gap-16">
            <Reveal>
              <div className="relative aspect-square w-full max-w-[180px] overflow-hidden rounded-lg sm:max-w-[220px] md:max-w-none">
                <Image
                  src="/images/alok-jha-portrait.jpg"
                  alt="Portrait of Alok Jha"
                  fill
                  sizes="(max-width: 768px) 220px, 280px"
                  className="object-cover"
                  priority
                />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="font-serif text-[32px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[38px]">
                Alok Jha
              </h1>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                HumanSignals.in
              </p>

              <p className="mt-5 max-w-[600px] text-[15.5px] leading-[1.8] text-ink/85">
                Alok Jha is an entrepreneur, business strategist and mentor
                with more than three decades of CXO-level experience. He
                holds an MBA and an MA in Psychology and works at the
                intersection of business, human behaviour, technology and
                education. Human Signals is his personal publication and
                research platform.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-6 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-serif text-[28px] font-semibold leading-none text-ink sm:text-[30px]">
                      {stat.value}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-content px-6 py-16 sm:px-10 md:py-20 lg:px-14">
          <Reveal>
            <span className="font-serif text-[48px] leading-none text-ink/20">
              &ldquo;
            </span>
            <p className="-mt-2 max-w-[680px] font-serif text-[19px] font-medium leading-relaxed text-ink sm:text-[22px]">
              I have spent much of my working life around businesses,
              founders, teams, customers and decisions. Psychology gave me
              another language for many things I had already seen in
              fragments: people staying with bad ideas because leaving felt
              like admitting failure; customers asking for more options and
              then becoming unable to choose; successful professionals
              discovering that a title had quietly become part of the self.
            </p>
            <p className="mt-4 text-[13px] text-muted">— Alok Jha</p>
          </Reveal>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal className="flex items-baseline gap-4">
              <span className="font-serif text-[15px] text-muted">01</span>
              <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">
                About Human Signals
              </h2>
            </Reveal>

            <Reveal delay={0.08} className="mt-6 max-w-[640px] space-y-5">
              <p className="text-[15.5px] leading-[1.8] text-ink/85">
                Human Signals is an independent publication by Alok Jha
                exploring psychology, behaviour and the choices people make
                — in life, money, business and an increasingly AI-shaped
                world.
              </p>
              <p className="text-[15.5px] leading-[1.8] text-ink/85">
                It runs on evidence — behavioural science, psychology,
                decision research — and it&rsquo;s written for people with
                no intention of reading a journal. Fifty essays sit across
                the five sections; five reports go deeper, one question
                each. A new essay arrives every week. All of it is free to
                read.
              </p>
              <p className="text-[15.5px] leading-[1.8] text-ink/85">
                What it won&rsquo;t do is tell you what to decide.
                There&rsquo;s no rulebook here, no life hacks, no five steps
                to anything. It&rsquo;s educational, not advisory: it
                won&rsquo;t diagnose you and it won&rsquo;t tell you where
                to put your money.
              </p>
            </Reveal>

            <Reveal delay={0.14} className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/articles"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Read the essays <span aria-hidden>→</span>
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center rounded-full border border-ink/25 px-6 py-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-cream"
              >
                Get the free reports
              </Link>
            </Reveal>
          </div>
        </section>

        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
