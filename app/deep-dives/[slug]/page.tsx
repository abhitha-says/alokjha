import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarkdownBody from "@/components/MarkdownBody";
import Paywall from "@/components/Paywall";
import TrackEvent from "@/components/analytics/TrackEvent";
import {
  buildDeepDivePreview,
  getDeepDiveBySlug,
  getEssaysByCategory,
} from "@/lib/source";
import {
  getEntitlements,
  resolveDeepDiveAccess,
  PREVIEW_SHARE,
  PREVIEW_MAX_SHARE,
  PRICING,
} from "@/lib/access";
import { auth } from "@/lib/auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";

// Reads auth session (cookies) — always rendered at request time.
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = await getDeepDiveBySlug(slug);
  if (!dive) return {};
  return {
    title: `${dive.title} — Human Signals Deep Dives`,
    description: dive.subtitle,
  };
}

export default async function DeepDivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const previewLocked = sp["preview"] === "locked";

  const dive = await getDeepDiveBySlug(slug);
  if (!dive) notFound();

  // Preview-as-locked-reader: an editor can visit with ?preview=locked to see
  // exactly what a non-member sees before publishing. For anyone who is not an
  // editor/admin we strip the param — readers must not be able to use it.
  let isEditorPreviewingLocked = false;
  if (previewLocked) {
    const session = await auth();
    const userId = session?.user?.id;
    let isEditor = false;

    if (userId && DATABASE_CONFIGURED) {
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      isEditor = user?.role === "editor" || user?.role === "admin";
    }

    if (isEditor) {
      isEditorPreviewingLocked = true;
    } else {
      // Not an editor — strip the param so readers can't see it.
      redirect(`/deep-dives/${slug}`);
    }
  }

  const entitlements = await getEntitlements();
  let access = resolveDeepDiveAccess(dive.slug, entitlements);

  // Override for editor preview.
  if (isEditorPreviewingLocked) {
    access = { granted: false, reason: "locked" };
  }

  // The gate. When access is not granted the remainder of `dive.body` is
  // discarded here, on the server, and never reaches the rendered page.
  const preview = access.granted
    ? null
    : buildDeepDivePreview(dive.body, PREVIEW_SHARE, PREVIEW_MAX_SHARE);
  const visibleBody = access.granted ? dive.body : preview!.preview;

  const relatedSignals = (await getEssaysByCategory(dive.series)).slice(0, 3);

  return (
    <>
      {/* Two distinct events rather than one with a boolean: "how many people
          read a complete Deep Dive" and "how many hit the boundary" are the
          two halves of the funnel and are always asked separately. */}
      {access.granted ? (
        <TrackEvent
          event="deep_dive_full_viewed"
          properties={{
            slug: dive.slug,
            series: dive.series,
            is_founding: dive.isFounding,
            access_reason: access.reason,
          }}
        />
      ) : (
        <TrackEvent
          event="deep_dive_preview_viewed"
          properties={{
            slug: dive.slug,
            series: dive.series,
            is_founding: dive.isFounding,
            preview_words: preview!.previewWords,
            total_words: preview!.totalWords,
          }}
        />
      )}
      <Header />
      <main>
        <article className="mx-auto max-w-[720px] px-6 py-14 sm:px-8 md:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {dive.code} · {dive.series} Series
            </span>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/70">
              {access.reason === "free-edition"
                ? "Free edition"
                : access.reason === "membership"
                  ? "In your membership"
                  : access.reason === "purchased"
                    ? "You own this"
                    : `${PRICING.deepDive.label} or membership`}
            </span>
          </div>

          <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            {dive.title}
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink/80 sm:text-[18px]">
            {dive.subtitle}
          </p>
          {dive.standfirst && (
            <p className="mt-3 text-[14.5px] italic leading-relaxed text-muted">
              {dive.standfirst}
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4 border-y border-line py-5 text-left sm:grid-cols-4">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Author
              </p>
              <p className="mt-1 text-[13.5px] text-ink">Alok Jha</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Reading
              </p>
              <p className="mt-1 text-[13.5px] text-ink">{dive.readingTime}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Series
              </p>
              <p className="mt-1 text-[13.5px] text-ink">{dive.series}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Access
              </p>
              <p className="mt-1 text-[13.5px] text-ink">
                {access.granted ? "Complete edition" : "Opening extract"}
              </p>
            </div>
          </div>

          <div className="mt-2">
            <MarkdownBody>{visibleBody}</MarkdownBody>
          </div>

          {access.granted ? (
            <>
              {dive.sources && (
                <div className="mt-10 border-t border-line pt-6">
                  <h2 className="font-serif text-[16px] font-semibold text-ink">
                    Selected evidence and further reading
                  </h2>
                  <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-ink">
                    <MarkdownBody>{dive.sources}</MarkdownBody>
                  </div>
                </div>
              )}

              <p className="mt-10 text-[12.5px] leading-relaxed text-muted">
                Deep Dives are educational publications. They are not clinical,
                therapeutic, medical, legal or personalised financial advice.
              </p>
              <p className="mt-3 border-t border-line pt-4 text-[12px] leading-relaxed text-muted">
                © Human Signals / Alok Jha. Licensed for personal reading only.
              </p>
            </>
          ) : (
            <Paywall
              title={dive.title}
              themes={preview!.themes}
              slug={dive.slug}
              series={dive.series}
            />
          )}
        </article>

        {relatedSignals.length > 0 && (
          <section className="border-t border-line bg-cream/50">
            <div className="mx-auto max-w-content px-6 py-14 sm:px-10 lg:px-14">
              <h2 className="font-serif text-[20px] font-semibold text-ink">
                Free Signals on {dive.series}
              </h2>
              <p className="mt-1.5 text-[13px] text-muted">
                No account, no payment — these are open to everyone.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
                {relatedSignals.map((s) => (
                  <Link key={s.slug} href={`/signals/${s.slug}`} className="group block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {s.readingTime}
                    </p>
                    <h3 className="mt-1.5 font-serif text-[16.5px] font-semibold leading-snug text-ink group-hover:text-accent">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                      {s.deck}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
