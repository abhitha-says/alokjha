"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { replayWebhookEvent } from "../actions";

export default function ReplayButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleReplay() {
    setPending(true);
    setResult(null);
    const res = await replayWebhookEvent(eventId);
    setPending(false);
    if (res.error) {
      setResult(`Error: ${res.error}`);
    } else {
      setResult("Replayed");
      router.refresh();
    }
  }

  return (
    <div>
      <button
        onClick={handleReplay}
        disabled={pending}
        className="text-[12px] text-accent hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Replay"}
      </button>
      {result && (
        <p className={`text-[11px] mt-0.5 ${result.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
