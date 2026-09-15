"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "../actions";

export default function DeleteAccountButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirm !== "DELETE") { setError("Type DELETE to confirm."); return; }
    if (!reason.trim()) { setError("Reason is required."); return; }
    setPending(true); setError(null);
    const result = await deleteAccount(userId, reason.trim());
    if (result.error) { setError(result.error); setPending(false); }
    else { router.push("/admin/readers"); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md text-[13px] font-medium border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
      >
        Delete account…
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3 mt-2">
      <p className="text-[13px] font-semibold text-red-800">Delete account (DPDP erasure)</p>
      <p className="text-[12px] text-red-700">
        This nulls PII (email, name, password hash, TOTP) and sets <code>deleted_at</code>. Payment records are retained for legal/audit purposes.
      </p>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="w-full border border-red-200 rounded-md px-3 py-1.5 text-[13px] bg-white text-ink focus:outline-none focus:border-red-400"
      />
      <div>
        <label className="text-[12px] text-red-700 block mb-1">Type DELETE to confirm</label>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          className="w-full border border-red-200 rounded-md px-3 py-1.5 text-[13px] bg-white text-ink focus:outline-none focus:border-red-400"
        />
      </div>
      {error && <p className="text-[12px] text-red-700 font-medium">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleDelete} disabled={pending} className="px-4 py-2 rounded-md text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
          {pending ? "Deleting…" : "Delete account"}
        </button>
        <button onClick={() => { setOpen(false); setError(null); setConfirm(""); setReason(""); }} disabled={pending} className="px-4 py-2 rounded-md text-[13px] font-medium border border-line text-muted hover:bg-cream">
          Cancel
        </button>
      </div>
    </div>
  );
}
