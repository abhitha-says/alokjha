"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Reveal from "./Reveal";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const submitted = result?.ok === true;

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
              One Signal every week, free by email.
              <br className="hidden sm:block" /> No spam. Just ideas that matter.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            {submitted ? (
              <p className="text-[14px] font-medium text-white">{result.message}</p>
            ) : (
              <form
                className="w-full max-w-[420px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData();
                  data.set("email", email);
                  data.set("source", pathname ?? "unknown");
                  startTransition(async () =>
                    setResult(await subscribeToNewsletter(data))
                  );
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Your email address
                  </label>
                  <input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full rounded-full border border-white/30 bg-white/95 px-5 py-3 text-[13.5px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="shrink-0 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? "Subscribing…" : "Subscribe"}
                  </button>
                </div>
                {result && !result.ok && (
                  <p role="alert" className="mt-2.5 text-[13px] text-white">
                    {result.message}
                  </p>
                )}
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
