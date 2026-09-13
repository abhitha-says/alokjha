"use client";

import Image from "next/image";
import { useState } from "react";
import Reveal from "./Reveal";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <div className="relative flex min-h-[300px] w-full items-center py-12 md:h-auto md:min-h-[260px] md:aspect-[2172/724] md:py-0">
        <Image
          src="/images/newsletter-bg.jpg"
          alt="Misty hills over a river at dusk, with the words: A more thoughtful you, a more human world."
          fill
          sizes="100vw"
          className="object-cover object-[30%_center] md:object-[38%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent md:from-black/65 md:via-black/25 md:to-transparent" />

        <div className="relative mx-auto grid w-full max-w-content grid-cols-1 items-center gap-6 px-6 sm:px-10 md:grid-cols-[1.1fr_1fr_0.7fr] md:gap-8 lg:px-14">
          <Reveal>
            <h2 className="font-serif text-[24px] font-semibold text-white sm:text-[26px]">
              Join Human Signals
            </h2>
            <p className="mt-2 max-w-[320px] text-[13.5px] leading-relaxed text-white/80">
              One thoughtful exploration of human behaviour each week.
              <br className="hidden sm:block" /> No spam. Just ideas that matter.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            {submitted ? (
              <p className="text-[14px] font-medium text-white">
                Thanks — check your inbox to confirm.
              </p>
            ) : (
              <form
                className="flex w-full max-w-[420px] flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) setSubmitted(true);
                }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full rounded-full border border-white/30 bg-white/95 px-5 py-3 text-[13.5px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  Subscribe
                </button>
              </form>
            )}
          </Reveal>

          <Reveal delay={0.2} className="md:hidden">
            <p className="font-hand text-[20px] italic leading-tight text-white/85">
              A more thoughtful
              <br />
              you, a more human world.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
