"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { nav } from "@/lib/content";
import type { SearchResult } from "@/app/api/search/route";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data: { results: SearchResult[] }) => setResults(data.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-[30px] py-[25px] sm:px-10 md:py-[30px] lg:px-10 xl:px-[70px]">
        <Link href="/" className="shrink-0">
          <span className="block font-serif text-[27.5px] font-semibold leading-none tracking-tight text-ink sm:text-[32.5px]">
            Human Signals
          </span>
          <span className="mt-1 hidden text-[13.75px] leading-none text-muted xl:block">
            Psychology, behaviour and the choices we make.
          </span>
        </Link>

        <nav className="hidden items-center gap-3 md:flex lg:gap-5 xl:gap-8">
          {nav.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-[14.5px] font-medium text-ink/80 transition-colors hover:text-ink lg:text-[15.5px] xl:text-[16.875px] ${
                  isActive
                    ? "text-ink after:absolute after:-bottom-[18px] after:left-0 after:h-[2px] after:w-full after:bg-ink"
                    : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 lg:gap-3 xl:gap-4">
          <button
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
            className="hidden text-ink/80 transition-colors hover:text-ink sm:block"
          >
            {searchOpen ? (
              <X size={22} strokeWidth={1.75} />
            ) : (
              <Search size={22} strokeWidth={1.75} />
            )}
          </button>
          <Link
            href="/subscribe"
            className="hidden rounded-full bg-ink px-4 py-2 text-[14px] font-medium text-paper transition-transform hover:scale-[1.03] active:scale-[0.98] sm:inline-block lg:px-5 lg:py-2.5 lg:text-[16.25px] xl:px-[25px]"
          >
            Subscribe
          </Link>
          <button
            aria-label="Menu"
            className="text-ink md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[15px] font-medium text-ink"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="mt-2 inline-block w-fit rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-paper"
              onClick={() => setOpen(false)}
            >
              Subscribe
            </Link>
          </nav>
        </div>
      )}

      {searchOpen && (
        <div className="border-t border-line bg-paper px-6 py-5 sm:px-8 lg:px-14">
          <div className="mx-auto max-w-content">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <Search size={18} strokeWidth={1.75} className="shrink-0 text-ink/50" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search essays and reports…"
                className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none"
              />
            </div>

            {query.trim() && (
              <div className="mt-3 max-h-[60vh] overflow-y-auto">
                {loading ? (
                  <p className="py-4 text-[13px] text-muted">Searching…</p>
                ) : results.length > 0 ? (
                  <ul className="divide-y divide-line">
                    {results.map((result) => (
                      <li key={result.href}>
                        <Link
                          href={result.href}
                          onClick={() => setSearchOpen(false)}
                          className="group flex items-start justify-between gap-4 py-3"
                        >
                          <span>
                            <span className="block text-[14.5px] font-medium text-ink group-hover:text-accent">
                              {result.title}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                              {result.description}
                            </span>
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.05em] text-muted">
                            {result.category}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-[13px] text-muted">
                    No results for &ldquo;{query}&rdquo;.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
