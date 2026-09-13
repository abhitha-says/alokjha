import Link from "next/link";
import { reports } from "@/lib/content";
import Reveal from "./Reveal";

export default function Reports() {
  return (
    <section className="mx-auto max-w-content px-6 py-14 sm:px-10 md:py-16 lg:px-14">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <Reveal className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-serif text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">
            Human Signals Reports
          </h2>
          <p className="text-[13px] text-muted">
            Evidence, ideas and implications for understanding human behaviour.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            href="/reports"
            className="whitespace-nowrap text-[13px] font-medium text-accent transition-colors hover:text-ink"
          >
            View all reports →
          </Link>
        </Reveal>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        {reports.map((report, i) => (
          <Reveal key={report.number} delay={i * 0.07}>
            <div className="border-t border-line pt-4">
              <p className="text-[12px] font-semibold text-muted">{report.number}</p>
              <h3 className="mt-2 font-serif text-[17px] font-semibold leading-snug text-ink">
                {report.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {report.description}
              </p>
              <Link
                href={report.href}
                className="group mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink"
              >
                Download Free
                <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
