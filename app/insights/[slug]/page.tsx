import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarkdownBody from "@/components/MarkdownBody";
import { getAllInsights, getInsightBySlug } from "@/lib/markdown-content";

export function generateStaticParams() {
  return getAllInsights()
    .filter((i) => !i.isFounding)
    .map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);
  if (!insight) return {};
  return {
    title: `${insight.title} — Human Signals Insights`,
    description: insight.subtitle,
  };
}

export default async function InsightPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);
  if (!insight) notFound();
  if (insight.isFounding && insight.reportSlug) {
    redirect(`/reports/${insight.reportSlug}`);
  }

  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-[720px] px-6 py-14 sm:px-8 md:py-20">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {insight.code} · {insight.series} Series
            </span>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/70">
              Free to read
            </span>
          </div>
          <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            {insight.title}
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink/80 sm:text-[18px]">
            {insight.subtitle}
          </p>

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
              <p className="mt-1 text-[13.5px] text-ink">{insight.readingTime}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Series
              </p>
              <p className="mt-1 text-[13.5px] text-ink">{insight.series}</p>
            </div>
            <div>
              <Link
                href="/insights"
                className="mt-1 inline-flex items-center gap-1 text-[13.5px] font-semibold text-ink"
              >
                All Insights →
              </Link>
            </div>
          </div>

          <div className="mt-2">
            <MarkdownBody>{insight.body}</MarkdownBody>
          </div>

          {insight.sources && (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="font-serif text-[16px] font-semibold text-ink">
                Selected evidence and further reading
              </h2>
              <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-ink">
                <MarkdownBody>{insight.sources}</MarkdownBody>
              </div>
            </div>
          )}

          <p className="mt-10 text-[12.5px] leading-relaxed text-muted">
            Human Signals Insights are educational publications. They are not clinical,
            therapeutic, medical, legal or personalised financial advice.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
