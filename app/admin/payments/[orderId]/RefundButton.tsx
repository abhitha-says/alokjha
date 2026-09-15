"use client";

import { useState } from "react";
import { initiateRefund } from "../actions";

export default function RefundButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefund() {
    if (!reason.trim()) {
      setError("A reason is required before issuing a refund.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await initiateRefund(orderId, reason.trim());
    if (result.error) {
      setError(result.error);
      setPending(false);
    } else {
      // Reload to reflect the new status
      window.location.reload();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md text-[13px] font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
      >
        Initiate refund…
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <p className="text-[13px] font-semibold text-red-800">
        Refund this payment via Razorpay
      </p>
      <p className="text-[12px] text-red-700">
        This will call the Razorpay API, revoke the entitlement, and log the action to the audit log. The action cannot be undone.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for refund (required)…"
        rows={2}
        className="w-full border border-red-200 rounded-md px-3 py-2 text-[13px] bg-white text-ink focus:outline-none focus:border-red-400 resize-none"
      />
      {error && (
        <p className="text-[12px] text-red-700 font-medium">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleRefund}
          disabled={pending}
          className="px-4 py-2 rounded-md text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {pending ? "Processing…" : "Confirm refund"}
        </button>
        <button
          onClick={() => { setOpen(false); setReason(""); setError(null); }}
          disabled={pending}
          className="px-4 py-2 rounded-md text-[13px] font-medium border border-line text-muted hover:bg-cream transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
