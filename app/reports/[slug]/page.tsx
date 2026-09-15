// Dynamic: reads params at request time.
export const instant = false;

import { permanentRedirect } from "next/navigation";

// /reports/:slug is now /deep-dives/:slug — the same edition, free to read.
export default async function ReportRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/deep-dives/${slug}`);
}
