"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  if (result?.ok) {
    return (
      <p className="rounded-lg border border-line bg-cream px-5 py-4 text-[14px] leading-relaxed text-ink">
        {result.message}
      </p>
    );
  }

  return (
    <form
      className="w-full max-w-[460px]"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData();
        data.set("email", email);
        data.set("source", pathname ?? "unknown");
        startTransition(async () => setResult(await subscribeToNewsletter(data)));
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="subscribe-email" className="sr-only">
          Your email address
        </label>
        <input
          id="subscribe-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-invalid={result?.ok === false}
          aria-describedby={result ? "subscribe-status" : undefined}
          className="w-full rounded-full border border-line bg-paper px-5 py-3 text-[13.5px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Subscribing…" : "Subscribe free"}
        </button>
      </div>

      {result && !result.ok && (
        <p
          id="subscribe-status"
          role="alert"
          className="mt-2.5 text-[13px] leading-relaxed text-accent"
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
