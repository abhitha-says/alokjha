import { NextRequest, NextResponse, after } from "next/server";
import { getAllEssays, getAllDeepDives } from "@/lib/markdown-content";
import { isFreeDeepDive, PRICING } from "@/lib/access";
import {
  captureServerEvent,
  ANONYMOUS_DISTINCT_ID,
} from "@/lib/posthog-server";
import { rateLimit, getIp } from "@/lib/rate-limit";

export interface SearchResult {
  type: "signal" | "deep-dive";
  title: string;
  description: string;
  category: string;
  /** Shown in the results list so access is legible before the click. */
  access: string;
  href: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  // Rate limit: 60 searches per IP per minute. Search hits the markdown
  // content cache, so it is fast, but an unbounded client could still use it
  // to scrape the full catalogue. The limit is generous enough that no
  // legitimate reader will ever hit it.
  const rl = await rateLimit(`search:${getIp(request)}`, 60, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      }
    );
  }

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const signalResults: SearchResult[] = getAllEssays()
    .filter(
      (signal) =>
        signal.title.toLowerCase().includes(query) ||
        signal.deck.toLowerCase().includes(query) ||
        signal.category.toLowerCase().includes(query)
    )
    .map((signal) => ({
      type: "signal",
      title: signal.title,
      description: signal.deck,
      category: signal.category,
      access: "Free Signal",
      href: `/signals/${signal.slug}`,
    }));

  const deepDiveResults: SearchResult[] = getAllDeepDives()
    .filter(
      (dive) =>
        dive.title.toLowerCase().includes(query) ||
        dive.subtitle.toLowerCase().includes(query) ||
        dive.series.toLowerCase().includes(query)
    )
    .map((dive) => ({
      type: "deep-dive",
      title: dive.title,
      description: dive.subtitle,
      category: dive.series,
      access: isFreeDeepDive(dive.slug)
        ? "Free edition"
        : `Deep Dive · ${PRICING.deepDive.label}`,
      href: `/deep-dives/${dive.slug}`,
    }));

  const results = [...signalResults, ...deepDiveResults].slice(0, 8);

  // Captured on the server because search runs here, and deferred with
  // `after` so a slow analytics call can never hold up an autocomplete
  // response. The query text itself is deliberately not sent — people type
  // things into a psychology site's search box that they would not say aloud,
  // and the length plus the hit count answer "is search working?" on their own.
  after(() =>
    captureServerEvent(ANONYMOUS_DISTINCT_ID, "search_performed", {
      query_length: query.length,
      result_count: results.length,
    })
  );

  return NextResponse.json({ results });
}
