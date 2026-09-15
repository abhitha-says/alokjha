"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revokeEntitlement } from "../actions";

export default function RevokeEntitlementButton({
  entitlementId,
  userId,
}: {
  entitlementId: string;
  userId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!reason.trim()) { setError("Reason is required."); return; }
    setPending(true); setError(null);
    const result = await revokeEntitlement(entitlementId, userId, reason.trim());
    if (result.error) { setError(result.error); setPending(false); }
    else { setOpen(false); router.refresh(); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-red-600 hover:underline"
      >
        Revoke
      </button>
    );
  }

  return (
    <div className="absolute z-10 right-0 top-0 bg-white border border-line rounded-lg shadow-lg p-3 w-64 space-y-2">
      <p className="text-[12px] font-semibold text-ink">Revoke entitlement</p>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="w-full border border-line rounded-md px-2.5 py-1.5 text-[12px] bg-white text-ink focus:outline-none focus:border-accent"
        autoFocus
      />
      {error && <p className="text-[11px] text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleRevoke}
          disabled={pending}
          className="px-3 py-1 rounded text-[12px] font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "…" : "Revoke"}
        </button>
        <button
          onClick={() => { setOpen(false); setReason(""); setError(null); }}
          className="px-3 py-1 rounded text-[12px] border border-line text-muted hover:bg-cream"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
