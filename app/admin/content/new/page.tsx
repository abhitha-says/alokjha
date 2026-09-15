import ContentEditor from "../[id]/ContentEditor";
import { requireEditor } from "@/lib/admin-auth";
import type { Content } from "@/lib/db/schema/content";

export const instant = false;

export default async function AdminContentNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireEditor();

  const sp = await searchParams;
  const kind = (sp.kind as Content["kind"]) ?? "signal";

  return <ContentEditor initial={null} defaultKind={kind} />;
}
