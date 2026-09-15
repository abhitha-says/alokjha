"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { grantEntitlement } from "../actions";

export default function GrantEntitlementForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"membership" | "deep_dive">("membership");
  const [plan, setPlan] = useState("founding");
  const [slug, setSlug] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim()) { setError("Reason is required."); return; }
    if (kind === "deep_dive" && !slug.trim()) { setError("Slug is required for a Deep Dive grant."); return; }
    setPending(true); setError(null);
    const result = await grantEntitlement(userId, kind, kind === "membership" ? plan : undefined, kind === "deep_dive" ? slug.trim() : undefined, reason.trim());
    if (result.error) { setError(result.error); setPending(false); }
    else { setOpen(false); router.refresh(); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-3.5 py-1.5 rounded-md text-[13px] font-medium border border-line text-muted hover:bg-cream transition-colors">
        + Grant entitlement
      </button>
    );
  }

  return (
    <div className="bg-cream border border-line rounded-lg p-4 space-y-3">
      <p className="text-[13px] font-semibold text-ink">Manual entitlement grant</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] text-muted block mb-1">Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "membership" | "deep_dive")}
            className="w-full border border-line rounded-md px-2.5 py-1.5 text-[13px] bg-white text-ink focus:outline-none focus:border-accent"
          >
            <option value="membership">Membership</option>
            <option value="deep_dive">Deep Dive</option>
          </select>
        </div>
        {kind === "membership" ? (
          <div>
            <label className="text-[12px] text-muted block mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full border border-line rounded-md px-2.5 py-1.5 text-[13px] bg-white text-ink focus:outline-none focus:border-accent"
            >
              <option value="founding">Founding</option>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="text-[12px] text-muted block mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="deep-dive-slug"
              className="w-full border border-line rounded-md px-2.5 py-1.5 text-[13px] bg-white text-ink focus:outline-none focus:border-accent"
            />
          </div>
        )}
      </div>
      <div>
        <label className="text-[12px] text-muted block mb-1">Reason (required)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. press comp, apology, founding gift"
          className="w-full border border-line rounded-md px-2.5 py-1.5 text-[13px] bg-white text-ink focus:outline-none focus:border-accent"
        />
      </div>
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={pending} className="px-4 py-1.5 rounded-md text-[13px] font-medium bg-ink text-white hover:bg-ink/80 transition-colors disabled:opacity-50">
          {pending ? "Granting…" : "Grant"}
        </button>
        <button onClick={() => { setOpen(false); setError(null); }} disabled={pending} className="px-4 py-1.5 rounded-md text-[13px] font-medium border border-line text-muted hover:bg-cream transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
