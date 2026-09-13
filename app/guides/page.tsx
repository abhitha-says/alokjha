import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import Reveal from "@/components/Reveal";
import { categories } from "@/lib/content";

export const metadata = {
  title: "Guides — Human Signals",
  description:
    "Short, evidence-led guides that turn psychology and behavioural science into something usable — for decisions in mind, choice, money, business and an AI-shaped world.",
};

export default function GuidesPage() {
  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Guides
          </p>
          <h1 className="mt-3 max-w-[620px] font-serif text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            Human connection, backed by human science.
          </h1>
          <p className="mt-4 max-w-[600px] text-[14.5px] leading-relaxed text-muted">
            Short, evidence-led guides for the decisions ordinary life
            actually asks of us — written the way Human Signals writes
            everything: no jargon, no rulebook, no life hacks.
          </p>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal className="max-w-[640px] space-y-5">
              <p className="text-[15.5px] leading-[1.8] text-ink/85">
                Most of what shapes a life doesn&rsquo;t happen in a crisis.
                It happens in a hard conversation, a purchase weighed too
                long, a decision made alone at 11pm with half the facts.
                Human Signals Guides are built for exactly those moments —
                each one takes a single, real question and works through
                what psychology and behavioural science actually say about
                it, translated out of the journal and into something you
                can use before Friday.
              </p>
              <p className="text-[15.5px] leading-[1.8] text-ink/85">
                The premise underneath every guide is the same one that
                runs through Human Signals: technology can inform a
                decision, but it can&rsquo;t sit in it with you. As more of
                daily life gets mediated by data, algorithms and AI, human
                connection — a good question, a second opinion, the
                discipline of talking it through with someone who knows you
                — isn&rsquo;t a nostalgic extra. It&rsquo;s the mechanism
                that turns information into judgement, and it&rsquo;s the
                thing modern life is quietly starving of.
              </p>
              <p className="text-[15.5px] leading-[1.8] text-ink/85">
                That&rsquo;s the standard each guide is held to: evidence
                over opinion, plain language over jargon, and a genuine
                answer to a question you actually have — not a checklist
                standing in for one.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                Where the guides come from
              </h2>
              <p className="mt-2 max-w-[520px] text-[13px] text-muted">
                Every guide grows out of one of the five signals Human
                Signals already writes about.
              </p>
            </Reveal>

            <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
              {categories.map((cat, i) => (
                <Reveal key={cat.title} delay={i * 0.07}>
                  <div className="border-t border-line pt-4">
                    <h3 className="font-serif text-[17px] font-semibold leading-snug text-ink">
                      {cat.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                      {cat.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-cream/50">
          <div className="mx-auto max-w-content px-6 py-14 text-center sm:px-10 lg:px-14">
            <Reveal>
              <span className="rounded-full bg-ink px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-paper">
                Coming soon
              </span>
              <h2 className="mt-4 font-serif text-[20px] font-semibold text-ink">
                The first guide is being written
              </h2>
              <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] leading-relaxed text-muted">
                Subscribe to Human Signals and it lands in your inbox the
                day it&rsquo;s ready — free, like everything else here.
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
