"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole } from "../actions";

export default function UpdateRoleForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) { setError("Reason required."); return; }
    setPending(true); setError(null);
    const result = await updateUserRole(userId, role as "reader" | "editor" | "admin", reason.trim());
    if (result.error) { setError(result.error); setPending(false); }
    else { setOpen(false); setReason(""); router.refresh(); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[12px] text-accent hover:underline">
        Change…
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border border-line rounded px-2 py-1 text-[12px] bg-white text-ink focus:outline-none focus:border-accent"
      >
        <option value="reader">reader</option>
        <option value="editor">editor</option>
        <option value="admin">admin</option>
      </select>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason…"
        className="block w-full border border-line rounded px-2 py-1 text-[12px] bg-white text-ink focus:outline-none focus:border-accent"
      />
      {error && <p className="text-[11px] text-red-700">{error}</p>}
      <div className="flex gap-1">
        <button onClick={handleSubmit} disabled={pending} className="px-2.5 py-1 rounded text-[11px] font-medium bg-ink text-white hover:bg-ink/80 disabled:opacity-50">
          {pending ? "…" : "Save"}
        </button>
        <button onClick={() => { setOpen(false); setRole(currentRole); setError(null); }} className="px-2.5 py-1 rounded text-[11px] border border-line text-muted hover:bg-cream">
          Cancel
        </button>
      </div>
    </div>
  );
}
