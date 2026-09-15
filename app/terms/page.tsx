import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  PRICING,
  UPGRADE_CREDIT_DAYS,
  PAYMENT_GRACE_DAYS,
  FOUNDING_MEMBER_LIMIT,
} from "@/lib/access";

export const metadata = {
  title: "Terms of access — Human Signals",
  description:
    "How access to Human Signals works: free Signals, individual Deep Dives, membership, cancellation and refunds.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-[720px] px-6 py-14 sm:px-8 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Terms of access
          </p>
          <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[36px]">
            What is free, what ₹299 unlocks, and what a membership covers
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
            Human Signals is a publication by Alok Jha. These terms set out how
            reading, buying and membership work. They are being finalised with
            legal counsel in India before launch; the substance below is the
            intended position.
          </p>

          <Section title="1. Free access">
            <P>
              Every weekly Signal is free to read on this site. No registration,
              payment or account is required, and none will be introduced for
              Signals.
            </P>
            <P>
              Anyone can also browse the complete list of Deep Dives, read the
              introduction and roughly the first fifth of every paid Deep Dive,
              read the Deep Dives released as complete free editions, and
              subscribe to the free weekly email.
            </P>
            <P>
              A Deep Dive released free stays free. One complete Deep Dive is
              intended to be released free each quarter.
            </P>
          </Section>

          <Section title="2. The free email subscription">
            <P>
              A free subscriber receives the weekly Signal by email, access to
              every free Signal and free Deep Dive edition, notification when a
              new Deep Dive is published and invitations to become a member. It
              is not a paid product and grants no access to paid Deep Dives.
            </P>
          </Section>

          <Section title={`3. Buying a single Deep Dive — ${PRICING.deepDive.label}`}>
            <P>
              Buying one Deep Dive gives you the complete edition, read online,
              through the email address or account you registered with. Access
              is permanent, meaning for as long as Human Signals continues to
              operate and to provide that content — not a promise of perpetual
              access under every circumstance.
            </P>
            <P>
              A single purchase does not unlock other paid Deep Dives, the
              complete archive, future Deep Dives or the quarterly member
              conversations.
            </P>
            <P>
              If you become an annual member within {UPGRADE_CREDIT_DAYS} days of
              the purchase, that {PRICING.deepDive.label} is deducted from the
              membership price. One {PRICING.deepDive.label} purchase is credited
              per upgrade transaction.
            </P>
          </Section>

          <Section title={`4. Monthly membership — ${PRICING.monthly.label} per month`}>
            <P>
              A monthly member reads every current Deep Dive, every new Deep Dive
              published while the membership is active, and the complete
              members&rsquo; archive, and is invited to the quarterly online
              member conversations. Access continues while payments remain
              current.
            </P>
            <P>
              On cancellation, no further payment is collected and access
              continues to the end of the paid monthly period. Member-only access
              then ends. Individually purchased Deep Dives remain accessible.
            </P>
          </Section>

          <Section title={`5. Annual membership — ${PRICING.annual.label} per year`}>
            <P>
              Annual members receive the same access as monthly members, for
              twelve months. At renewal, the membership renews at the price
              communicated before the renewal date. Any price change is disclosed
              in advance.
            </P>
          </Section>

          <Section title={`6. Founding membership — ${PRICING.founding.label} for the first year`}>
            <P>
              Founding membership is limited to the first {FOUNDING_MEMBER_LIMIT}{" "}
              members and carries the same access as annual membership, together
              with optional &ldquo;Founding Member&rdquo; recognition and early
              invitations to member conversations and feedback sessions. After
              the first year it renews at the prevailing annual price — currently{" "}
              {PRICING.annual.label}.
            </P>
          </Section>

          <Section title="7. The quarterly member conversation">
            <P>
              One online group conversation each quarter, of approximately 60
              minutes, discussing recent Human Signals themes. It is an
              educational interaction. It is not personal consulting, therapy or
              psychological advice, and it does not include individual access to
              Alok Jha. Recording is optional and depends on participant consent.
            </P>
          </Section>

          <Section title="8. How access is used">
            <P>Access is personal and non-transferable.</P>
            <P>
              One member may read Human Signals on their own personal devices.
              Password and account sharing are prohibited. Organisations cannot
              circulate one individual membership among employees; corporate
              access may be offered separately later.
            </P>
            <P>
              Unusual account activity — for example simultaneous access from
              many locations — may be investigated. An account will receive a
              warning before any suspension.
            </P>
            <P>
              Applicable taxes, if any, are shown at checkout. A failed recurring
              payment has a {PAYMENT_GRACE_DAYS}-day grace period before access is
              suspended.
            </P>
          </Section>

          <Section title="9. Refunds">
            <P>
              Free access involves no payment and so no refund. An individual
              Deep Dive is non-refundable once it has been accessed, except in
              the case of a duplicate payment or a technical failure.
            </P>
            <P>
              A monthly membership can be cancelled at any time; there is no
              prorated refund for the current month. An annual membership may be
              refunded within {UPGRADE_CREDIT_DAYS} days of a first purchase,
              provided substantial member-only content has not been accessed.
              Once a renewal period has begun there is no refund, except in the
              case of a billing error.
            </P>
          </Section>

          <Section title="10. Copyright">
            <P>
              All Human Signals content is the original work of Alok Jha and is
              protected under the Copyright Act, 1957. Content may not be shared,
              republished, uploaded, resold or commercially distributed without
              written permission.
            </P>
            <P>
              Human Signals is read online. There are no PDF downloads at launch.
              If personalised offline editions are introduced later, they will be
              licensed for personal use only and will carry the reader&rsquo;s own
              identifying details.
            </P>
          </Section>

          <Section title="11. Scope">
            <P>
              Human Signals is an educational publication. It is not clinical,
              therapeutic, medical, legal or personalised financial advice, and
              nothing in it should be relied on as a substitute for professional
              guidance.
            </P>
          </Section>

          <p className="mt-12 border-t border-line pt-6 text-[12.5px] leading-relaxed text-muted">
            Questions about access are answered on the{" "}
            <Link
              href="/membership"
              className="text-accent underline underline-offset-2 hover:text-ink"
            >
              membership page
            </Link>
            . © Human Signals / Alok Jha. Licensed for personal reading only.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-line pt-7">
      <h2 className="font-serif text-[19px] font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14.5px] leading-[1.8] text-ink/85">{children}</p>;
}
