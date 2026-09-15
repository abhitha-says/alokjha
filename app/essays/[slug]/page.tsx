// Dynamic: reads params at request time.
export const instant = false;

import { permanentRedirect } from "next/navigation";

// /essays/:slug is now /signals/:slug.
export default async function EssayRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/signals/${slug}`);
}
