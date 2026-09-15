import { permanentRedirect } from "next/navigation";

export const instant = false;


// "Essays" became "Signals" in the current access model. Kept so existing
// links, shares and search results do not break.
export default async function ArticlesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  permanentRedirect(category ? `/signals?category=${encodeURIComponent(category)}` : "/signals");
}
