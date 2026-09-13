import { NextRequest, NextResponse } from "next/server";
import { getAllEssays, getAllInsights, getAllReports } from "@/lib/markdown-content";

export interface SearchResult {
  type: "essay" | "report" | "insight";
  title: string;
  description: string;
  category: string;
  href: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const essayResults: SearchResult[] = getAllEssays()
    .filter(
      (essay) =>
        essay.title.toLowerCase().includes(query) ||
        essay.deck.toLowerCase().includes(query) ||
        essay.category.toLowerCase().includes(query)
    )
    .map((essay) => ({
      type: "essay",
      title: essay.title,
      description: essay.deck,
      category: essay.category,
      href: `/essays/${essay.slug}`,
    }));

  const reportResults: SearchResult[] = getAllReports()
    .filter(
      (report) =>
        report.title.toLowerCase().includes(query) ||
        report.subtitle.toLowerCase().includes(query) ||
        report.standfirst.toLowerCase().includes(query) ||
        report.category.toLowerCase().includes(query)
    )
    .map((report) => ({
      type: "report",
      title: report.title,
      description: report.standfirst || report.subtitle,
      category: report.category,
      href: `/reports/${report.slug}`,
    }));

  const insightResults: SearchResult[] = getAllInsights()
    .filter(
      (insight) =>
        insight.title.toLowerCase().includes(query) ||
        insight.subtitle.toLowerCase().includes(query) ||
        insight.series.toLowerCase().includes(query)
    )
    .map((insight) => ({
      type: "insight",
      title: insight.title,
      description: insight.subtitle,
      category: insight.series,
      href: insight.isFounding
        ? `/reports/${insight.reportSlug}`
        : `/insights#hsi-${insight.number}`,
    }));

  const results = [...essayResults, ...reportResults, ...insightResults].slice(0, 8);

  return NextResponse.json({ results });
}
