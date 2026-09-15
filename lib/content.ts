export const categories = [
  {
    title: "Mind",
    description: "How we think, feel and see the world.",
    image: "/images/cat-mind.jpg",
    href: "/signals?category=Mind",
  },
  {
    title: "Choice",
    description: "Why we choose, change or stay the same.",
    image: "/images/cat-choice.jpg",
    href: "/signals?category=Choice",
  },
  {
    title: "Money",
    description: "Behaviour behind earning, spending and enough.",
    image: "/images/cat-money.jpg",
    href: "/signals?category=Money",
  },
  {
    title: "Business",
    description: "People, decisions and organisations.",
    image: "/images/cat-business.jpg",
    href: "/signals?category=Business",
  },
  {
    title: "AI + Human",
    description: "Technology, behaviour and what remains human.",
    image: "/images/cat-ai-human.jpg",
    href: "/signals?category=ai-human",
  },
] as const;

// Flagship picks per lib/markdown-content.ts real essay data. Image is the only
// thing curated by hand here; title/deck/category/reading time are always pulled
// live from the parsed Signal so the homepage card can never drift out of sync
// with the page it links to.
export const featuredSignalSlugs = [
  { slug: "who-are-you-when-your-job-title-disappears", image: "/images/essay-job-title.jpg" },
  { slug: "why-intelligent-people-make-irrational-decisions", image: "/images/essay-choose-what-know.jpg" },
  { slug: "why-people-with-enough-money-still-feel-financially-insecure", image: "/images/essay-quiet-anxiety.jpg" },
  { slug: "why-999-feels-different-from-1000", image: "/images/essay-good-companies.jpg" },
] as const;

export const nav = [
  { label: "Home", href: "/" },
  { label: "Signals", href: "/signals" },
  { label: "Deep Dives", href: "/deep-dives" },
  { label: "Membership", href: "/membership" },
  { label: "About", href: "/about" },
] as const;
