"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import MarkdownBody from "@/components/MarkdownBody";
import {
  saveContentAction,
  publishContentAction,
  scheduleContentAction,
  archiveContentAction,
  deleteContentAction,
  type SaveContentInput,
} from "../actions";
import type { Content, ContentRevision } from "@/lib/db/schema/content";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

type EditorContent = Pick<
  Content,
  | "id"
  | "kind"
  | "slug"
  | "number"
  | "title"
  | "subtitle"
  | "deck"
  | "standfirst"
  | "teaser"
  | "category"
  | "bodyMd"
  | "sourcesMd"
  | "coverImageUrl"
  | "status"
  | "scheduledFor"
  | "publishedAt"
  | "isFreeEdition"
  | "isFounding"
  | "previewShare"
  | "seo"
  | "wordCount"
  | "readingMinutes"
>;

interface ContentEditorProps {
  initial: EditorContent | null;
  defaultKind?: Content["kind"];
  revisionCount?: number;
}

const CATEGORIES: Content["category"][] = [
  "Mind",
  "Choice",
  "Money",
  "Business",
  "AI + Human",
];

/* ------------------------------------------------------------------ *
 * Slug derivation — must match server-side slugify in actions.ts
 * ------------------------------------------------------------------ */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/₹/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* ------------------------------------------------------------------ *
 * Editor
 * ------------------------------------------------------------------ */

export default function ContentEditor({
  initial,
  defaultKind = "signal",
  revisionCount = 0,
}: ContentEditorProps) {
  const isNew = !initial?.id;
  const publishedSlug = initial?.status === "published" ? initial.slug : null;

  // Form state
  const [kind] = useState<Content["kind"]>(initial?.kind ?? defaultKind);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slugOverride, setSlugOverride] = useState(initial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(false);
  const [number, setNumber] = useState(initial?.number ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [deck, setDeck] = useState(initial?.deck ?? "");
  const [standfirst, setStandfirst] = useState(initial?.standfirst ?? "");
  const [teaser, setTeaser] = useState(initial?.teaser ?? "");
  const [category, setCategory] = useState<Content["category"]>(
    initial?.category ?? "Mind"
  );
  const [bodyMd, setBodyMd] = useState(initial?.bodyMd ?? "");
  const [sourcesMd, setSourcesMd] = useState(initial?.sourcesMd ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initial?.coverImageUrl ?? ""
  );
  const [isFreeEdition, setIsFreeEdition] = useState(
    initial?.isFreeEdition ?? false
  );
  const [isFounding, setIsFounding] = useState(initial?.isFounding ?? false);
  const [previewShare, setPreviewShare] = useState(
    initial?.previewShare ? String(initial.previewShare) : ""
  );
  const [seoTitle, setSeoTitle] = useState(initial?.seo?.title ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initial?.seo?.description ?? ""
  );
  const [seoOgImage, setSeoOgImage] = useState(initial?.seo?.ogImage ?? "");
  const [changeNote, setChangeNote] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  const [activeTab, setActiveTab] = useState<"editor" | "seo" | "settings">(
    "editor"
  );
  const [previewPane, setPreviewPane] = useState(true);

  const [status, setStatus] = useState<string>(initial?.status ?? "draft");
  const [savedId, setSavedId] = useState<string | undefined>(initial?.id);
  const [savedSlug, setSavedSlug] = useState<string>(initial?.slug ?? "");

  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Derived slug
  const derivedSlug = slugManual ? slugOverride : slugify(title);
  const slugChanged =
    publishedSlug && derivedSlug !== publishedSlug;

  // Word count (client-side estimate)
  const wordCount = bodyMd.trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 220));

  function buildInput(): SaveContentInput {
    return {
      id: savedId,
      kind,
      slug: slugManual ? slugOverride : undefined,
      number: number || undefined,
      title,
      subtitle: subtitle || undefined,
      deck: deck || undefined,
      standfirst: standfirst || undefined,
      teaser: teaser || undefined,
      category,
      bodyMd,
      sourcesMd: sourcesMd || undefined,
      coverImageUrl: coverImageUrl || undefined,
      isFreeEdition,
      isFounding,
      previewShare: previewShare || undefined,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoOgImage: seoOgImage || undefined,
      changeNote: changeNote || undefined,
    };
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveContentAction(buildInput());
      if (result.ok) {
        setSavedId(result.id);
        setSavedSlug(result.slug ?? "");
        setChangeNote("");
        showToast("Saved ✓");
      } else {
        setError(result.error ?? "Save failed.");
      }
    });
  }

  function handlePublish() {
    if (!savedId) {
      setError("Save the piece before publishing.");
      return;
    }
    startTransition(async () => {
      await publishContentAction(savedId);
      setStatus("published");
      showToast("Published ✓");
    });
  }

  function handleSchedule() {
    if (!savedId || !scheduleDate) {
      setError("Save the piece and set a schedule date first.");
      return;
    }
    startTransition(async () => {
      await scheduleContentAction(savedId, new Date(scheduleDate));
      setStatus("scheduled");
      showToast("Scheduled ✓");
    });
  }

  function handleArchive() {
    if (!savedId) return;
    startTransition(async () => {
      await archiveContentAction(savedId);
      setStatus("archived");
      showToast("Archived ✓");
    });
  }

  function handleDelete() {
    if (!savedId) return;
    if (
      !window.confirm(
        "Soft-delete this piece? It will no longer be visible to readers."
      )
    )
      return;
    startTransition(async () => {
      await deleteContentAction(savedId);
    });
  }

  const statusColor: Record<string, string> = {
    draft: "text-yellow-700 bg-yellow-50",
    scheduled: "text-blue-700 bg-blue-50",
    published: "text-green-700 bg-green-50",
    archived: "text-gray-500 bg-gray-50",
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-line bg-white shrink-0">
        <div className="flex items-center gap-3">
          <a href="/admin/content" className="text-muted text-[13px] hover:text-ink">
            ← Content
          </a>
          <span className="text-line">/</span>
          <span className="text-[13px] text-ink font-medium">
            {isNew ? `New ${kind.replace("_", " ")}` : title || "Untitled"}
          </span>
          <span
            className={`text-[10.5px] font-semibold px-2 py-0.5 rounded uppercase tracking-[0.08em] ${statusColor[status] ?? "text-muted bg-cream"}`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview as locked reader */}
          {savedSlug && kind === "deep_dive" && (
            <a
              href={`/deep-dives/${savedSlug}?preview=locked`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-[12px] border border-line rounded text-muted hover:text-ink hover:border-accent transition-colors"
            >
              Preview locked
            </a>
          )}

          {/* Revisions */}
          {savedId && (
            <a
              href={`/admin/content/${savedId}/revisions`}
              className="px-3 py-1.5 text-[12px] border border-line rounded text-muted hover:text-ink transition-colors"
            >
              Revisions ({revisionCount})
            </a>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-1.5 text-[13px] font-medium bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save draft"}
          </button>

          {/* Publish */}
          {status !== "published" && savedId && (
            <button
              onClick={handlePublish}
              disabled={isPending}
              className="px-4 py-1.5 text-[13px] font-medium bg-ink text-white rounded hover:bg-ink/80 disabled:opacity-50 transition-colors"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-[13px]">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Slug warning */}
      {slugChanged && (
        <div className="px-6 py-2 bg-orange-50 border-b border-orange-200 text-orange-700 text-[12px]">
          ⚠️ Slug will change from <code className="font-mono">{publishedSlug}</code> to{" "}
          <code className="font-mono">{derivedSlug}</code>. This breaks every existing link,
          share and search result for this piece.
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — form */}
        <div className="w-[480px] shrink-0 flex flex-col border-r border-line overflow-y-auto bg-white">
          {/* Tabs */}
          <div className="flex border-b border-line">
            {(["editor", "seo", "settings"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-[12px] font-medium capitalize transition-colors ${
                  activeTab === t
                    ? "border-b-2 border-ink text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5 flex-1">
            {activeTab === "editor" && (
              <>
                <Field label="Title" required>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={INPUT}
                    placeholder="Enter title…"
                  />
                </Field>

                <Field label="Slug">
                  <div className="flex items-center gap-2">
                    <input
                      value={derivedSlug}
                      onChange={(e) => {
                        setSlugManual(true);
                        setSlugOverride(e.target.value);
                      }}
                      className={`${INPUT} font-mono text-[12px]`}
                      placeholder="auto-derived"
                    />
                    {slugManual && (
                      <button
                        onClick={() => setSlugManual(false)}
                        className="text-[11px] text-muted hover:text-ink whitespace-nowrap"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Number">
                    <input
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className={INPUT}
                      placeholder="e.g. 07 or HSI 042"
                    />
                  </Field>
                  <Field label="Category" required>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Content["category"])}
                      className={INPUT}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Subtitle / deck">
                  <input
                    value={kind === "signal" ? deck : subtitle}
                    onChange={(e) =>
                      kind === "signal"
                        ? setDeck(e.target.value)
                        : setSubtitle(e.target.value)
                    }
                    className={INPUT}
                    placeholder={kind === "signal" ? "Deck line" : "Subtitle"}
                  />
                </Field>

                {kind === "deep_dive" && (
                  <Field label="Standfirst">
                    <textarea
                      value={standfirst}
                      onChange={(e) => setStandfirst(e.target.value)}
                      className={`${INPUT} resize-none`}
                      rows={2}
                      placeholder="Short italic intro"
                    />
                  </Field>
                )}

                <Field label="Teaser">
                  <textarea
                    value={teaser}
                    onChange={(e) => setTeaser(e.target.value)}
                    className={`${INPUT} resize-none`}
                    rows={2}
                    placeholder="Card teaser text"
                  />
                </Field>

                <Field label={`Body (${wordCount.toLocaleString()} words · ${readingMinutes} min read)`} required>
                  <textarea
                    value={bodyMd}
                    onChange={(e) => setBodyMd(e.target.value)}
                    className={`${INPUT} resize-none font-mono text-[12px] leading-relaxed`}
                    rows={28}
                    placeholder="Write in Markdown…"
                  />
                </Field>

                <details className="group">
                  <summary className="text-[12px] font-medium text-muted cursor-pointer hover:text-ink">
                    Sources / references
                  </summary>
                  <div className="mt-2">
                    <textarea
                      value={sourcesMd}
                      onChange={(e) => setSourcesMd(e.target.value)}
                      className={`${INPUT} resize-none font-mono text-[12px]`}
                      rows={6}
                      placeholder="Markdown list of sources…"
                    />
                  </div>
                </details>

                <Field label="Change note (optional)">
                  <input
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    className={INPUT}
                    placeholder="What changed in this save?"
                  />
                </Field>
              </>
            )}

            {activeTab === "seo" && (
              <>
                <Field label="SEO title">
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className={INPUT}
                    placeholder="Defaults to page title"
                  />
                </Field>
                <Field label="Meta description">
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className={`${INPUT} resize-none`}
                    rows={3}
                    placeholder="150–160 characters"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    {seoDescription.length} / 160
                  </p>
                </Field>
                <Field label="OG image URL">
                  <input
                    value={seoOgImage}
                    onChange={(e) => setSeoOgImage(e.target.value)}
                    className={INPUT}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Cover image URL">
                  <input
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    className={INPUT}
                    placeholder="https://…"
                  />
                </Field>
              </>
            )}

            {activeTab === "settings" && (
              <>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFreeEdition}
                      onChange={(e) => setIsFreeEdition(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-[13px] font-medium text-ink">
                        Free edition
                      </p>
                      <p className="text-[11px] text-muted">
                        Open to all readers without sign-in. Replaces the
                        hardcoded FREE_DEEP_DIVE_SLUGS — toggling this is what
                        makes a code deploy unnecessary.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFounding}
                      onChange={(e) => setIsFounding(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-[13px] font-medium text-ink">
                        Founding Five badge
                      </p>
                      <p className="text-[11px] text-muted">
                        Display badge only. Does not affect access.
                      </p>
                    </div>
                  </label>
                </div>

                <Field label="Preview share override">
                  <input
                    type="number"
                    min="0.10"
                    max="0.50"
                    step="0.01"
                    value={previewShare}
                    onChange={(e) => setPreviewShare(e.target.value)}
                    className={INPUT}
                    placeholder="e.g. 0.22 (leave blank for global default)"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Fraction of body shown to locked readers. Global default is
                    22% (0.22). Some Deep Dives give the argument away by
                    paragraph 4 and need a shorter extract.
                  </p>
                </Field>

                {/* Scheduling */}
                <Field label="Schedule publication">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className={INPUT}
                  />
                  <button
                    onClick={handleSchedule}
                    disabled={isPending || !savedId || !scheduleDate}
                    className="mt-2 px-3 py-1.5 text-[12px] border border-line rounded text-ink hover:bg-cream disabled:opacity-40 transition-colors"
                  >
                    Schedule
                  </button>
                </Field>

                {/* Danger zone */}
                <div className="pt-4 border-t border-line">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-3">
                    Danger zone
                  </p>
                  <div className="flex gap-2">
                    {status === "published" && (
                      <button
                        onClick={handleArchive}
                        disabled={isPending || !savedId}
                        className="px-3 py-1.5 text-[12px] border border-line rounded text-muted hover:bg-cream disabled:opacity-40"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      disabled={isPending || !savedId}
                      className="px-3 py-1.5 text-[12px] border border-red-200 rounded text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Delete (soft)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right panel — live preview */}
        <div className="flex-1 overflow-y-auto bg-paper">
          <div className="flex items-center justify-between px-6 py-2.5 border-b border-line bg-cream/50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Live preview
            </p>
            <button
              onClick={() => setPreviewPane(!previewPane)}
              className="text-[11px] text-muted hover:text-ink"
            >
              {previewPane ? "Hide" : "Show"}
            </button>
          </div>

          {previewPane && (
            <div className="mx-auto max-w-[680px] px-8 py-10">
              {title && (
                <h1 className="font-serif text-[28px] font-semibold leading-[1.15] text-ink mb-2">
                  {title}
                </h1>
              )}
              {(kind === "signal" ? deck : subtitle) && (
                <p className="text-[16px] leading-relaxed text-ink/80 mb-6">
                  {kind === "signal" ? deck : subtitle}
                </p>
              )}
              {bodyMd ? (
                <MarkdownBody>{bodyMd}</MarkdownBody>
              ) : (
                <p className="text-muted text-[14px] italic">
                  Start writing to see a preview…
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const INPUT =
  "w-full border border-line rounded-md px-3 py-1.5 text-[13px] bg-white text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
