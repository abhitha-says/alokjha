// Dynamic: reads params at request time.
export const instant = false;

import { permanentRedirect } from "next/navigation";

// /insights/:slug is now /deep-dives/:slug.
export default async function InsightRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/deep-dives/${slug}`);
}
