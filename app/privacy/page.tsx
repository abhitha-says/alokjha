import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy — Human Signals",
  description:
    "What Human Signals collects, why, and what it does not do with it.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-[720px] px-6 py-14 sm:px-8 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Privacy
          </p>
          <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[36px]">
            What we collect, and why
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
            A full privacy policy is being prepared with legal counsel in India
            ahead of launch. This page describes the intended position.
          </p>

          <div className="mt-10 space-y-8 border-t border-line pt-8">
            <div>
              <h2 className="font-serif text-[19px] font-semibold text-ink">
                Reading Human Signals
              </h2>
              <p className="mt-3 text-[14.5px] leading-[1.8] text-ink/85">
                You can read every Signal, and every free Deep Dive edition,
                without an account and without giving us anything.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-[19px] font-semibold text-ink">
                If you subscribe
              </h2>
              <p className="mt-3 text-[14.5px] leading-[1.8] text-ink/85">
                We hold your email address so that the weekly Signal can reach
                you. It is used for that, for notices about new Deep Dives, and
                for occasional invitations to become a member. Every email
                carries an unsubscribe link, and unsubscribing removes you.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-[19px] font-semibold text-ink">
                If you buy or join
              </h2>
              <p className="mt-3 text-[14.5px] leading-[1.8] text-ink/85">
                We hold the email address on your account and a record of what
                you have bought, because that record is what grants you access.
                Payment is handled by the payment provider; card details are
                never stored by Human Signals.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-[19px] font-semibold text-ink">
                What we do not do
              </h2>
              <p className="mt-3 text-[14.5px] leading-[1.8] text-ink/85">
                We do not sell or rent reader data, and we do not share it with
                advertisers.
              </p>
            </div>
          </div>

          <p className="mt-12 border-t border-line pt-6 text-[12.5px] leading-relaxed text-muted">
            How access itself works is set out in the{" "}
            <Link
              href="/terms"
              className="text-accent underline underline-offset-2 hover:text-ink"
            >
              terms of access
            </Link>
            .
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
