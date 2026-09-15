import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import {
  PRICING,
  ANNUAL_SAVING,
  UPGRADE_CREDIT_DAYS,
  PAYMENT_GRACE_DAYS,
  FOUNDING_MEMBER_LIMIT,
  FREE_DEEP_DIVE_SLUGS,
} from "@/lib/access";
import { getAllDeepDives, getAllEssays } from "@/lib/markdown-content";

export const metadata = {
  title: "Membership — Human Signals",
  description:
    "Signals are free to discover. Deep Dives can be bought individually for ₹299. Membership from ₹199/month unlocks the complete body of work.",
};

const MONTHLY_OVER_A_YEAR = (PRICING.monthly.amount * 12).toLocaleString("en-IN");

const PLANS = [
  {
    id: "free",
    eyebrow: "Free",
    name: "The weekly Signal",
    price: "₹0",
    cadence: "",
    summary: "The whole point of Human Signals is that most of it is open.",
    features: [
      "Every weekly Signal, delivered by email",
      "Every Signal on the site, free and without registration",
      "Selected complete Deep Dives released free",
      "The introduction and opening of every paid Deep Dive",
      "Notification whenever a new Deep Dive is published",
    ],
    cta: { label: "Subscribe free", href: "/subscribe" },
    emphasis: false,
  },
  {
    id: "one-deep-dive",
    eyebrow: "One-time",
    name: "One Deep Dive",
    price: PRICING.deepDive.label,
    cadence: "one-time",
    summary: "Buy the one you want, keep it.",
    features: [
      "Complete online access to this Deep Dive",
      "Permanent access through your Human Signals account",
      `${PRICING.deepDive.label} credited if you become a member within ${UPGRADE_CREDIT_DAYS} days`,
    ],
    cta: { label: "Browse Deep Dives", href: "/deep-dives" },
    emphasis: false,
  },
  {
    id: "monthly",
    eyebrow: "Membership",
    name: "Monthly",
    price: PRICING.monthly.label,
    cadence: "/month",
    summary: "The complete library, month by month.",
    features: [
      "Complete online access to every Deep Dive",
      "Full members' archive",
      "Every new Deep Dive while membership is active",
      "Quarterly online member conversations",
      "Cancel anytime",
    ],
    cta: { label: "Become a member", href: "#how-to-join" },
    emphasis: false,
  },
  {
    id: "annual",
    eyebrow: "Recommended",
    name: "Annual",
    price: PRICING.annual.label,
    cadence: "/year",
    summary: `Everything in monthly membership, with two months effectively free — a saving of ₹${ANNUAL_SAVING}.`,
    features: [
      "Complete online access to every Deep Dive",
      "Full members' archive",
      "Every new Deep Dive published during the year",
      "Quarterly online member conversations",
      `₹${MONTHLY_OVER_A_YEAR} paid monthly, against ${PRICING.annual.label} as annual`,
    ],
    cta: { label: "Become an annual member", href: "#how-to-join" },
    emphasis: true,
  },
  {
    id: "founding",
    eyebrow: `First ${FOUNDING_MEMBER_LIMIT} members only`,
    name: "Founding",
    price: PRICING.founding.label,
    cadence: "first year",
    summary: "Annual membership at a founding price, for the people who arrive first.",
    features: [
      "The same access as an annual member",
      `${PRICING.founding.label} for the first year`,
      "Optional “Founding Member” recognition",
      "Early invitations to member conversations and feedback sessions",
      `Renews afterwards at the prevailing annual price — currently ${PRICING.annual.label}`,
    ],
    cta: { label: "Claim a founding place", href: "#how-to-join" },
    emphasis: false,
  },
] as const;

const ACCESS_MATRIX = [
  {
    reader: "Public reader",
    signals: "All free",
    deepDives: "Opening extract, plus the free editions in full",
    archive: "—",
  },
  {
    reader: "Free email subscriber",
    signals: "All free, by email",
    deepDives: "Opening extract, plus the free editions in full",
    archive: "—",
  },
  {
    reader: `One-time buyer (${PRICING.deepDive.label})`,
    signals: "All free",
    deepDives: "The purchased Deep Dive, permanently",
    archive: "—",
  },
  {
    reader: "Monthly member",
    signals: "All free",
    deepDives: "The complete library while the membership is active",
    archive: "Full archive + quarterly conversations",
  },
  {
    reader: "Annual or founding member",
    signals: "All free",
    deepDives: "The complete library while the membership is active",
    archive: "Full archive + quarterly conversations",
  },
] as const;

const NOT_INCLUDED = [
  "Other paid Deep Dives",
  "The complete archive",
  "Future Deep Dives",
  "Quarterly member conversations",
] as const;

const ACCESS_RULES = [
  "Access is personal and non-transferable.",
  "One member can read Human Signals on their own personal devices.",
  "Password or account sharing is not permitted.",
  "Organisations cannot circulate one individual membership among employees. Corporate access may be introduced separately later.",
  "Human Signals content may not be shared, republished, uploaded, resold or commercially distributed without written permission.",
  "Applicable taxes, if any, are shown at checkout.",
  `A failed recurring payment has a ${PAYMENT_GRACE_DAYS}-day grace period before access is suspended.`,
] as const;

const REFUNDS = [
  {
    heading: "Free access",
    body: "Nothing is charged, so nothing needs refunding.",
  },
  {
    heading: `Individual Deep Dive (${PRICING.deepDive.label})`,
    body: "Non-refundable once the Deep Dive has been opened, except in the case of a duplicate payment or a technical failure.",
  },
  {
    heading: "Monthly membership",
    body: "Cancellable at any time. No prorated refund for the current month; access continues to the end of the paid period.",
  },
  {
    heading: "Annual membership",
    body: `A ${UPGRADE_CREDIT_DAYS}-day refund window on a first purchase, provided substantial member-only content has not been read.`,
  },
  {
    heading: "Renewals",
    body: "No refund once the renewal period has begun, except in the case of a billing error.",
  },
] as const;

const CANCELLATION = [
  "No further payment is collected.",
  "Access continues until the end of the paid period.",
  "Member-only access then ends.",
  "Individually purchased Deep Dives remain accessible.",
] as const;

export default function MembershipPage() {
  const signalCount = getAllEssays().length;
  const diveCount = getAllDeepDives().length;

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Membership
          </p>
          <h1 className="mt-3 max-w-[640px] font-serif text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            Signals are free to discover. Deep Dives can be bought individually.
            Membership unlocks the complete body of work.
          </h1>
          <p className="mt-4 max-w-[600px] text-[14.5px] leading-relaxed text-muted">
            {signalCount} Signals, free to everyone, forever. {diveCount} Deep
            Dives, {FREE_DEEP_DIVE_SLUGS.length} of them complete and free, the
            rest available singly or with a membership. Everything is read
            online through your Human Signals account.
          </p>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((plan, i) => (
                <Reveal key={plan.id} delay={i * 0.06}>
                  <div
                    id={plan.id}
                    className={`flex h-full scroll-mt-28 flex-col rounded-lg border p-6 ${
                      plan.emphasis
                        ? "border-ink/25 bg-cream ring-1 ring-ink/5"
                        : "border-line bg-paper"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${
                        plan.emphasis ? "text-accent" : "text-muted"
                      }`}
                    >
                      {plan.eyebrow}
                    </p>
                    <h2 className="mt-2 font-serif text-[21px] font-semibold text-ink">
                      {plan.name}
                    </h2>
                    <p className="mt-3 font-serif text-[32px] font-semibold leading-none text-ink">
                      {plan.price}
                      {plan.cadence && (
                        <span className="ml-1.5 text-[13.5px] font-normal text-muted">
                          {plan.cadence}
                        </span>
                      )}
                    </p>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                      {plan.summary}
                    </p>
                    <ul className="mt-5 flex-1 space-y-2 text-[13.5px] leading-relaxed text-ink/80">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2.5">
                          <span aria-hidden className="text-accent">
                            —
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={plan.cta.href}
                      className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                        plan.emphasis
                          ? "bg-ink text-paper"
                          : "border border-ink/25 text-ink hover:bg-cream"
                      }`}
                    >
                      {plan.cta.label}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>

            <p className="mt-8 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Buy a single Deep Dive and upgrade within {UPGRADE_CREDIT_DAYS}{" "}
              days, and that {PRICING.deepDive.label} is deducted from annual
              membership. One {PRICING.deepDive.label} purchase is credited per
              upgrade. At renewal, annual membership renews at the price
              communicated before the renewal date; any change is disclosed in
              advance.
            </p>
          </div>
        </section>

        <section className="border-t border-line bg-cream/50">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                What each reader can access
              </h2>
              <p className="mt-2 max-w-[560px] text-[13px] text-muted">
                Human Signals is read online. There are no PDF downloads at
                launch — personalised offline editions may be introduced later
                for annual and founding members if members ask for them.
              </p>
            </Reveal>

            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    {["Reader", "Signals", "Deep Dives", "Archive and conversations"].map(
                      (head) => (
                        <th
                          key={head}
                          scope="col"
                          className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
                        >
                          {head}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ACCESS_MATRIX.map((row) => (
                    <tr key={row.reader} className="border-b border-line last:border-0">
                      <th
                        scope="row"
                        className="py-4 pr-4 align-top text-[13.5px] font-medium text-ink"
                      >
                        {row.reader}
                      </th>
                      <td className="py-4 pr-4 align-top text-[13.5px] leading-relaxed text-muted">
                        {row.signals}
                      </td>
                      <td className="py-4 pr-4 align-top text-[13.5px] leading-relaxed text-muted">
                        {row.deepDives}
                      </td>
                      <td className="py-4 align-top text-[13.5px] leading-relaxed text-muted">
                        {row.archive}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-content grid-cols-1 gap-10 px-6 py-14 sm:px-10 md:grid-cols-2 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                What a {PRICING.deepDive.label} purchase does not unlock
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                Buying one Deep Dive gives you that Deep Dive, permanently. It
                does not open the rest of the work.
              </p>
              <ul className="mt-5 space-y-2 text-[13.5px] leading-relaxed text-ink/80">
                {NOT_INCLUDED.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="text-muted">
                      ×
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                If you cancel a membership
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                Cancelling is one click and takes effect at the end of the period
                you have already paid for.
              </p>
              <ul className="mt-5 space-y-2 text-[13.5px] leading-relaxed text-ink/80">
                {CANCELLATION.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="text-accent">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                The quarterly member conversation
              </h2>
              <div className="mt-4 max-w-[640px] space-y-3 text-[14.5px] leading-[1.8] text-ink/85">
                <p>
                  One online group conversation every quarter, running about 60
                  minutes, discussing recent Human Signals themes. It is an
                  educational interaction — not personal consulting, therapy or
                  psychological advice, and not individual access to Alok.
                </p>
                <p className="text-[13.5px] text-muted">
                  Recording is optional and depends on the consent of the people
                  taking part.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line bg-cream/50">
          <div className="mx-auto grid max-w-content grid-cols-1 gap-10 px-6 py-14 sm:px-10 md:grid-cols-2 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                Access rules
              </h2>
              <ul className="mt-5 space-y-2.5 text-[13.5px] leading-relaxed text-ink/80">
                {ACCESS_RULES.map((rule) => (
                  <li key={rule} className="flex gap-2.5">
                    <span aria-hidden className="text-accent">
                      —
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                Refunds
              </h2>
              <dl className="mt-5 divide-y divide-line border-y border-line">
                {REFUNDS.map((item) => (
                  <div key={item.heading} className="py-3.5">
                    <dt className="text-[13.5px] font-medium text-ink">
                      {item.heading}
                    </dt>
                    <dd className="mt-1 text-[13.5px] leading-relaxed text-muted">
                      {item.body}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
                The full position is set out in the{" "}
                <Link
                  href="/terms"
                  className="text-accent underline underline-offset-2 hover:text-ink"
                >
                  membership terms
                </Link>
                .
              </p>
            </Reveal>
          </div>
        </section>

        <section id="how-to-join" className="scroll-mt-28 border-t border-line">
          <div className="mx-auto max-w-content px-6 py-14 text-center sm:px-10 md:py-16 lg:px-14">
            <Reveal>
              <h2 className="font-serif text-[24px] font-semibold text-ink">
                Joining Human Signals
              </h2>
              <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-relaxed text-muted">
                Memberships open alongside the paid Deep Dives. Subscribe to the
                free weekly Signal and you will be invited first, at the founding
                price, while founding places remain.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/subscribe"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  Subscribe free →
                </Link>
                <Link
                  href="/deep-dives"
                  className="inline-flex items-center rounded-full border border-ink/25 px-6 py-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-cream"
                >
                  Read a Deep Dive opening
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
