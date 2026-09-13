import Link from "next/link";
import { nav } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-14">
        <div>
          <span className="font-serif text-[19px] font-semibold text-ink">
            Human Signals
          </span>
          <p className="mt-1 text-[12.5px] text-muted">
            Psychology, behaviour and the choices we make.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink/70">
          {nav.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </nav>

        <p className="text-[12px] text-muted">
          © {new Date().getFullYear()} Human Signals. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
