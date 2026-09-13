export const categories = [
  {
    title: "Mind",
    description: "How we think, feel and see the world.",
    image: "/images/cat-mind.jpg",
    href: "/articles?category=Mind",
  },
  {
    title: "Choice",
    description: "Why we choose, change or stay the same.",
    image: "/images/cat-choice.jpg",
    href: "/articles?category=Choice",
  },
  {
    title: "Money",
    description: "Behaviour behind earning, spending and enough.",
    image: "/images/cat-money.jpg",
    href: "/articles?category=Money",
  },
  {
    title: "Business",
    description: "People, decisions and organisations.",
    image: "/images/cat-business.jpg",
    href: "/articles?category=Business",
  },
  {
    title: "AI + Human",
    description: "Technology, behaviour and what remains human.",
    image: "/images/cat-ai-human.jpg",
    href: "/articles?category=ai-human",
  },
] as const;

// Flagship picks per lib/markdown-content.ts real essay data (see
// HumanSignals_Developer_Brief.md "Six flagship essays to publish at launch").
// Image is the only thing curated by hand here; title/deck/category/reading
// time are always pulled live from the parsed essay so the homepage card can
// never drift out of sync with the essay page it links to.
export const featuredEssaySlugs = [
  { slug: "who-are-you-when-your-job-title-disappears", image: "/images/essay-job-title.jpg" },
  { slug: "why-intelligent-people-make-irrational-decisions", image: "/images/essay-choose-what-know.jpg" },
  { slug: "why-people-with-enough-money-still-feel-financially-insecure", image: "/images/essay-quiet-anxiety.jpg" },
  { slug: "why-999-feels-different-from-1000", image: "/images/essay-good-companies.jpg" },
] as const;

export const reports = [
  {
    number: "01",
    title: "The Choice Trap",
    description:
      "Why more options, information and persuasion don't always produce better decisions.",
    href: "/reports/the-choice-trap",
  },
  {
    number: "02",
    title: "The Indian Buyer",
    description:
      "Trust, value, aspiration and hesitation in a rapidly changing consumer market.",
    href: "/reports/the-indian-buyer",
  },
  {
    number: "03",
    title: "When Humans Trust Machines",
    description:
      "Confidence, dependence and judgement in the age of AI advice.",
    href: "/reports/when-humans-trust-machines",
  },
  {
    number: "04",
    title: "After the Role Changes",
    description: "Identity, purpose and reinvention in the second half of life.",
    href: "/reports/after-the-role-changes",
  },
  {
    number: "05",
    title: "The Founder Mind Under Pressure",
    description:
      "How identity, optimism and uncertainty influence entrepreneurial decisions.",
    href: "/reports/the-founder-mind-under-pressure",
  },
] as const;

export const nav = [
  { label: "Home", href: "/" },
  { label: "Essays", href: "/articles" },
  { label: "Reports", href: "/reports" },
  { label: "Insights", href: "/insights" },
  { label: "Guides", href: "/guides" },
  { label: "About", href: "/about" },
] as const;
