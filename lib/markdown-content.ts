import fs from "node:fs";
import path from "node:path";

export type Category = "Mind" | "Choice" | "Money" | "Business" | "AI + Human";

export const CATEGORY_SLUGS: Record<Category, string> = {
  Mind: "Mind",
  Choice: "Choice",
  Money: "Money",
  Business: "Business",
  "AI + Human": "ai-human",
};

export const CATEGORY_META: Record<
  Category,
  { description: string; image: string }
> = {
  Mind: {
    description: "Psychology, emotions, identity, relationships, ageing, purpose.",
    image: "/images/cat-mind.jpg",
  },
  Choice: {
    description: "Behavioural science, decision-making, biases, habits and judgement.",
    image: "/images/cat-choice.jpg",
  },
  Money: {
    description: "Financial behaviour, spending, saving, security, status and retirement.",
    image: "/images/cat-money.jpg",
  },
  Business: {
    description: "Consumer, founder and workplace psychology.",
    image: "/images/cat-business.jpg",
  },
  "AI + Human": {
    description: "Trust, autonomy, cognition and behaviour around AI.",
    image: "/images/cat-ai-human.jpg",
  },
};

export interface Essay {
  number: number;
  slug: string;
  title: string;
  deck: string;
  category: Category;
  body: string;
  readingTime: string;
}

export interface Source {
  text: string;
}

export interface Report {
  number: string;
  slug: string;
  title: string;
  subtitle: string;
  standfirst: string;
  category: Category;
  body: string;
  sources: string;
  readingTime: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[₹’']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatCallouts(text: string): string {
  return text.replace(
    /\*\*A QUIET QUESTION\*\*\n\n(.+?)(?=\n\n|$)/gs,
    (_m, question) => `> **A quiet question**\n> ${question.trim()}`
  );
}

function readingTime(text: string, wpm: number): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return `${minutes} min read`;
}

const ESSAYS_FILE = path.join(
  process.cwd(),
  "Human_Signals_50_Essays_Alok_Jha (1).md"
);
const REPORTS_FILE = path.join(
  process.cwd(),
  "Human_Signals_Reports_Volume_1.md"
);

let essaysCache: Essay[] | null = null;
let sourcesCache: Record<Category, string> | null = null;

function parseEssays(): Essay[] {
  if (essaysCache) return essaysCache;

  const raw = fs.readFileSync(ESSAYS_FILE, "utf-8");
  const [, ...chunks] = raw.split(
    /\*\*HUMAN SIGNALS \| ([A-Z0-9 +]+) \| ESSAY (\d+)\*\*/
  );

  const essays: Essay[] = [];
  for (let i = 0; i < chunks.length; i += 3) {
    const categoryRaw = chunks[i].trim();
    const number = parseInt(chunks[i + 1], 10);
    const content = chunks[i + 2];

    const titleMatch = content.match(/^\s*#\s+(.+?)\s*$/m);
    const deckMatch = content.match(/^_(.+?)_\s*$/m);
    if (!titleMatch || !deckMatch) continue;

    const title = titleMatch[1].trim();
    const deck = deckMatch[1].trim();

    const bodyStart = content.indexOf(deckMatch[0]) + deckMatch[0].length;
    const body = content.slice(bodyStart).trim();

    const category = (
      categoryRaw === "AI + HUMAN"
        ? "AI + Human"
        : categoryRaw.charAt(0) + categoryRaw.slice(1).toLowerCase()
    ) as Category;

    essays.push({
      number,
      slug: slugify(title),
      title,
      deck,
      category,
      body,
      readingTime: readingTime(body, 250),
    });
  }

  essaysCache = essays;
  return essays;
}

function parseSources(): Record<Category, string> {
  if (sourcesCache) return sourcesCache;

  const raw = fs.readFileSync(ESSAYS_FILE, "utf-8");
  const anchorIndex = raw.indexOf("# Selected Research Anchors & Further Reading");
  const tail = anchorIndex >= 0 ? raw.slice(anchorIndex) : "";

  const sectionMatches = [...tail.matchAll(/^## (.+?)\s*$/gm)];
  const result = {} as Record<Category, string>;

  for (let i = 0; i < sectionMatches.length; i++) {
    const heading = sectionMatches[i][1].trim();
    const start = sectionMatches[i].index! + sectionMatches[i][0].length;
    const end =
      i + 1 < sectionMatches.length ? sectionMatches[i + 1].index! : tail.length;
    const body = tail.slice(start, end).trim();

    const category = (
      heading === "AI + HUMAN"
        ? "AI + Human"
        : heading.charAt(0) + heading.slice(1).toLowerCase()
    ) as Category;
    result[category] = body;
  }

  sourcesCache = result;
  return result;
}

export function getAllEssays(): Essay[] {
  return parseEssays();
}

export function getEssayBySlug(slug: string): Essay | undefined {
  return parseEssays().find((e) => e.slug === slug);
}

export function getEssaysByCategory(category: Category): Essay[] {
  return parseEssays().filter((e) => e.category === category);
}

export function getRelatedEssays(essay: Essay, count = 3): Essay[] {
  return parseEssays()
    .filter((e) => e.category === essay.category && e.slug !== essay.slug)
    .slice(0, count);
}

export function getSourcesForCategory(category: Category): string {
  return parseSources()[category] ?? "";
}

const REPORT_CATEGORY: Record<string, Category> = {
  "the-choice-trap": "Choice",
  "the-indian-buyer": "Money",
  "when-humans-trust-machines": "AI + Human",
  "after-the-role-changes": "Mind",
  "the-founder-mind-under-pressure": "Business",
};

let reportsCache: Report[] | null = null;

function parseReports(): Report[] {
  if (reportsCache) return reportsCache;

  const raw = fs.readFileSync(REPORTS_FILE, "utf-8");
  const [, ...chunks] = raw.split(/\*\*HUMAN SIGNALS REPORT (\d+)\*\*/);

  const reports: Report[] = [];
  for (let i = 0; i < chunks.length; i += 2) {
    const number = chunks[i].trim();
    const content = chunks[i + 1];

    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""));

    const nonEmpty = lines.filter(Boolean);
    const title = nonEmpty[0];
    const subtitle = nonEmpty[1];
    const standfirstMatch = content.match(/^_(.+?)_\s*$/m);
    const standfirst = standfirstMatch ? standfirstMatch[1].trim() : "";

    const bylineIdx = content.indexOf("By Alok Jha");
    const bodyStart = bylineIdx >= 0 ? content.indexOf("\n", bylineIdx) : 0;

    const sourcesHeading = "## Selected evidence and further reading";
    const sourcesIdx = content.indexOf(sourcesHeading);

    const body = formatCallouts(
      sourcesIdx >= 0
        ? content.slice(bodyStart, sourcesIdx).trim()
        : content.slice(bodyStart).trim()
    );
    const sources =
      sourcesIdx >= 0
        ? content.slice(sourcesIdx + sourcesHeading.length).trim()
        : "";

    const slug = slugify(title);

    reports.push({
      number: number.padStart(2, "0"),
      slug,
      title,
      subtitle,
      standfirst,
      category: REPORT_CATEGORY[slug] ?? "Choice",
      body,
      sources,
      readingTime: readingTime(body, 300),
    });
  }

  reportsCache = reports;
  return reports;
}

export function getAllReports(): Report[] {
  return parseReports();
}

export function getReportBySlug(slug: string): Report | undefined {
  return parseReports().find((r) => r.slug === slug);
}
