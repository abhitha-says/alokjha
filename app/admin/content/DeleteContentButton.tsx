"use client";

import { useState, useTransition } from "react";
import { deleteContentAction } from "./actions";

export default function DeleteContentButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Delete "${title}"? It will no longer be visible to readers.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteContentAction(id);
      } catch (err) {
        // redirect() throws internally on success — only surface real failures.
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          setError(err.message);
        }
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-[11.5px] font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 transition-colors"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
