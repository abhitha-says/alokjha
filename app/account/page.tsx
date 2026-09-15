import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  getEntitlements,
  planLabel,
  FREE_DEEP_DIVE_SLUGS,
  PRICING,
  PAYMENT_GRACE_DAYS,
} from "@/lib/access";
import { getAllDeepDives } from "@/lib/source";

// Always rendered at request time — reads auth session / cookies.
export const instant = false;

export const metadata = {
  title: "Your account — Human Signals",
  description:
    "Everything you have access to on Human Signals: your membership, the Deep Dives you own and the editions that are free to everyone.",
};

export default async function AccountPage() {
  const entitlements = await getEntitlements();
  const dives = await getAllDeepDives();
  const owned = dives.filter((d) => entitlements.purchasedDeepDives.includes(d.slug));
  const freeEditions = dives.filter((d) => FREE_DEEP_DIVE_SLUGS.includes(d.slug));
  const hasMembership = entitlements.membershipActive && entitlements.plan !== "none";

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-[760px] px-6 py-14 sm:px-8 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Your account
          </p>
          <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[36px]">
            {entitlements.signedIn ? "Everything you have access to" : "Sign in to Human Signals"}
          </h1>

          {entitlements.signedIn ? (
            <>
              <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
                Signed in as{" "}
                <span className="text-ink">{entitlements.email ?? "your account"}</span>.
              </p>

              <div className="mt-8 divide-y divide-line border-y border-line">
                <div className="flex items-baseline justify-between gap-4 py-4">
                  <span className="text-[13.5px] text-muted">Membership</span>
                  <span className="text-[14px] font-medium text-ink">
                    {planLabel(entitlements.plan)}
                    {entitlements.plan !== "none" &&
                      (entitlements.membershipActive ? " · active" : " · lapsed")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4">
                  <span className="text-[13.5px] text-muted">Deep Dives you own</span>
                  <span className="text-[14px] font-medium text-ink">{owned.length}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4">
                  <span className="text-[13.5px] text-muted">Weekly Signal by email</span>
                  <span className="text-[14px] font-medium text-ink">
                    {entitlements.emailSubscriber ? "Subscribed" : "Not subscribed"}
                  </span>
                </div>
              </div>

              {hasMembership && (
                <p className="mt-6 text-[13.5px] leading-relaxed text-ink/80">
                  Your membership opens all {dives.length} Deep Dives and every
                  new one published while it stays active.{" "}
                  <Link
                    href="/deep-dives"
                    className="text-accent underline underline-offset-2 hover:text-ink"
                  >
                    Read the library →
                  </Link>
                </p>
              )}

              {owned.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-serif text-[18px] font-semibold text-ink">
                    Deep Dives you have bought
                  </h2>
                  <p className="mt-1.5 text-[13px] text-muted">
                    These stay available through this account, whether or not you
                    hold a membership.
                  </p>
                  <ul className="mt-4 divide-y divide-line border-t border-line">
                    {owned.map((dive) => (
                      <li key={dive.slug}>
                        <Link
                          href={`/deep-dives/${dive.slug}`}
                          className="group flex items-baseline justify-between gap-4 py-3.5"
                        >
                          <span className="text-[14px] font-medium text-ink group-hover:text-accent">
                            {dive.title}
                          </span>
                          <span className="shrink-0 text-[12px] text-muted">
                            {dive.code}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mt-4 max-w-[560px] text-[14.5px] leading-relaxed text-muted">
                Signing in is only needed for Deep Dives you have bought or a
                membership you hold. Every Signal, and every free Deep Dive
                edition, is open without an account.
              </p>

              <div className="mt-8 rounded-lg border border-line bg-cream px-6 py-6">
                <p className="text-[13.5px] leading-relaxed text-ink/85">
                  Accounts open when memberships and paid Deep Dives go on sale.
                  Until then there is nothing to sign in to.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/membership"
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    See membership
                  </Link>
                  <Link
                    href="/subscribe"
                    className="inline-flex items-center rounded-full border border-ink/25 px-5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper"
                  >
                    Subscribe free
                  </Link>
                </div>
              </div>
            </>
          )}

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-serif text-[18px] font-semibold text-ink">
              Free to read either way
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">
              {freeEditions.length} complete Deep Dives are open to everyone, and
              stay that way.
            </p>
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {freeEditions.map((dive) => (
                <li key={dive.slug}>
                  <Link
                    href={`/deep-dives/${dive.slug}`}
                    className="group flex items-baseline justify-between gap-4 py-3.5"
                  >
                    <span className="text-[14px] font-medium text-ink group-hover:text-accent">
                      {dive.title}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted">{dive.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 space-y-2 border-t border-line pt-6 text-[12.5px] leading-relaxed text-muted">
            <p>
              Access is personal and non-transferable. Human Signals is read
              online; there are no PDF downloads at launch.
            </p>
            <p>
              A single Deep Dive is {PRICING.deepDive.label}. A failed recurring
              payment has a {PAYMENT_GRACE_DAYS}-day grace period before access is
              suspended, and you are warned before that happens. Full detail in
              the{" "}
              <Link
                href="/terms"
                className="text-accent underline underline-offset-2 hover:text-ink"
              >
                membership terms
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
