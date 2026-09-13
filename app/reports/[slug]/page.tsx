import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarkdownBody from "@/components/MarkdownBody";
import {
  getAllReports,
  getReportBySlug,
  getEssaysByCategory,
} from "@/lib/markdown-content";

export function generateStaticParams() {
  return getAllReports().map((report) => ({ slug: report.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = getReportBySlug(slug);
  if (!report) return {};
  return {
    title: `${report.title} — Human Signals Reports`,
    description: report.subtitle,
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = getReportBySlug(slug);
  if (!report) notFound();

  const relatedEssays = getEssaysByCategory(report.category).slice(0, 3);

  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-[720px] px-6 py-14 sm:px-8 md:py-20">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Report {report.number}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/70">
              Free
            </span>
          </div>
          <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            {report.title}
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink/80 sm:text-[18px]">
            {report.subtitle}
          </p>
          <p className="mt-3 text-[14.5px] italic leading-relaxed text-muted">
            {report.standfirst}
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
              <p className="mt-1 text-[13.5px] text-ink">{report.readingTime}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Volume
              </p>
              <p className="mt-1 text-[13.5px] text-ink">Reports · Volume 1</p>
            </div>
            <div>
              <Link
                href="#download"
                className="mt-1 inline-flex items-center gap-1 text-[13.5px] font-semibold text-ink"
              >
                Download free →
              </Link>
            </div>
          </div>

          <div className="mt-2">
            <MarkdownBody>{report.body}</MarkdownBody>
          </div>

          {relatedEssays.length > 0 && (
            <div className="mt-12 border-t border-line pt-6">
              <h2 className="font-serif text-[16px] font-semibold text-ink">
                Related essays
              </h2>
              <div className="mt-4 space-y-5">
                {relatedEssays.map((e) => (
                  <Link key={e.slug} href={`/essays/${e.slug}`} className="group block">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {e.category}
                    </p>
                    <h3 className="mt-1 text-[15px] font-semibold text-ink group-hover:text-accent">
                      {e.title}
                    </h3>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                      {e.deck}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {report.sources && (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="font-serif text-[16px] font-semibold text-ink">
                Selected evidence and further reading
              </h2>
              <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-ink">
                <MarkdownBody>{report.sources}</MarkdownBody>
              </div>
            </div>
          )}

          <div
            id="download"
            className="mt-14 scroll-mt-24 rounded-lg bg-cream px-6 py-8 text-center sm:px-10"
          >
            <h2 className="font-serif text-[20px] font-semibold text-ink">
              {report.title}
            </h2>
            <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] text-muted">
              Free to download. Part of the Human Signals Founding Reports series.
            </p>
            <Link
              href="/subscribe"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Download Free →
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
