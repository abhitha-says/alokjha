"use client";

import { useTransition } from "react";
import { restoreRevisionAction } from "../../actions";

export function RestoreButton({
  contentId,
  revisionId,
  version,
}: {
  contentId: string;
  revisionId: string;
  version: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRestore() {
    if (
      !window.confirm(
        `Restore revision v${version}? The current body will be saved as a new revision before the restore.`
      )
    )
      return;
    startTransition(async () => {
      await restoreRevisionAction(contentId, revisionId);
    });
  }

  return (
    <button
      onClick={handleRestore}
      disabled={isPending}
      className="text-[11px] text-orange-600 hover:underline disabled:opacity-40"
    >
      {isPending ? "Restoring…" : "Restore"}
    </button>
  );
}
