import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllReports } from "@/lib/markdown-content";

export const metadata = {
  title: "Reports — Human Signals",
  description:
    "Five founding Human Signals reports, evidence-led explorations of how people choose, buy, trust, adapt and persist.",
};

export default function ReportsPage() {
  const reports = getAllReports();

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Reports · Volume 1
          </p>
          <h1 className="mt-3 max-w-[560px] font-serif text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
            Five evidence-led explorations of how people choose, buy, trust,
            adapt and persist.
          </h1>
          <p className="mt-4 max-w-[560px] text-[14.5px] leading-relaxed text-muted">
            Evidence, ideas and implications for understanding human
            behaviour — free to download, and part of the Human Signals
            Founding Series.
          </p>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-content divide-y divide-line px-6 sm:px-10 lg:px-14">
            {reports.map((report) => (
              <Link
                key={report.slug}
                href={`/reports/${report.slug}`}
                className="group flex flex-col gap-2 py-10 sm:flex-row sm:items-start sm:gap-8"
              >
                <span className="shrink-0 font-serif text-[15px] text-muted">
                  {report.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-serif text-[22px] font-semibold leading-snug text-ink group-hover:text-accent sm:text-[24px]">
                    {report.title}
                  </span>
                  <span className="mt-2 block max-w-[560px] break-words text-[14.5px] leading-relaxed text-muted">
                    {report.subtitle}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-ink">
                    Download Free
                    <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-medium uppercase tracking-[0.05em] text-muted">
                  {report.readingTime}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
