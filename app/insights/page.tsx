import { permanentRedirect } from "next/navigation";

export const instant = false;


// "Insights" are now published as Deep Dives.
export default async function InsightsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  permanentRedirect(
    category ? `/deep-dives?category=${encodeURIComponent(category)}` : "/deep-dives"
  );
}
