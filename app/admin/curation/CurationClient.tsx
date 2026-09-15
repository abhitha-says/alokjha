"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import {
  saveCurationAction,
  removePlacementAction,
  addPlacementAction,
  type Surface,
  type PlacementInput,
} from "./actions";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface PlacementRow {
  id: string;
  contentId: string;
  title: string;
  kind: string;
  slug: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AvailableContent {
  id: string;
  title: string;
  kind: string;
  slug: string;
}

interface CurationSurfaceProps {
  surface: Surface;
  label: string;
  description: string;
  placements: PlacementRow[];
  available: AvailableContent[];
}

/* ------------------------------------------------------------------ *
 * Sortable item
 * ------------------------------------------------------------------ */

function SortableItem({
  item,
  surface,
  onRemove,
  onDateChange,
}: {
  item: PlacementRow;
  surface: Surface;
  onRemove: (contentId: string) => void;
  onDateChange: (contentId: string, field: "startsAt" | "endsAt", value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.contentId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-line rounded-lg p-3 flex items-start gap-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted hover:text-ink p-0.5 shrink-0"
        aria-label="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {item.kind.replace("_", " ")}
          </span>
        </div>
        <p className="text-[13px] font-medium text-ink truncate mt-0.5">
          {item.title}
        </p>
        <p className="text-[11px] font-mono text-muted">{item.slug}</p>

        {/* Schedule window */}
        <div className="flex gap-3 mt-2">
          <label className="text-[11px] text-muted">
            From
            <input
              type="datetime-local"
              value={item.startsAt ?? ""}
              onChange={(e) => onDateChange(item.contentId, "startsAt", e.target.value)}
              className="ml-1.5 border border-line rounded px-1.5 py-0.5 text-[11px] text-ink bg-white"
            />
          </label>
          <label className="text-[11px] text-muted">
            Until
            <input
              type="datetime-local"
              value={item.endsAt ?? ""}
              onChange={(e) => onDateChange(item.contentId, "endsAt", e.target.value)}
              className="ml-1.5 border border-line rounded px-1.5 py-0.5 text-[11px] text-ink bg-white"
            />
          </label>
        </div>
      </div>

      <button
        onClick={() => onRemove(item.contentId)}
        className="text-muted hover:text-red-600 transition-colors shrink-0 text-[18px] leading-none"
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One surface panel
 * ------------------------------------------------------------------ */

function CurationSurface({
  surface,
  label,
  description,
  placements: initial,
  available,
}: CurationSurfaceProps) {
  const [items, setItems] = useState<PlacementRow[]>(initial);
  const [addSearch, setAddSearch] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.contentId === active.id);
    const newIndex = items.findIndex((i) => i.contentId === over.id);
    setItems(arrayMove(items, oldIndex, newIndex));
  }

  function handleRemove(contentId: string) {
    setItems((prev) => prev.filter((i) => i.contentId !== contentId));
  }

  function handleDateChange(
    contentId: string,
    field: "startsAt" | "endsAt",
    value: string
  ) {
    setItems((prev) =>
      prev.map((i) => (i.contentId === contentId ? { ...i, [field]: value || null } : i))
    );
  }

  const filteredAvailable = available.filter(
    (a) =>
      !items.find((i) => i.contentId === a.id) &&
      a.title.toLowerCase().includes(addSearch.toLowerCase())
  );

  function handleAdd(item: AvailableContent) {
    setItems((prev) => [
      ...prev,
      {
        id: item.id,
        contentId: item.id,
        title: item.title,
        kind: item.kind,
        slug: item.slug,
        startsAt: null,
        endsAt: null,
      },
    ]);
    setAddSearch("");
  }

  function handleSave() {
    startTransition(async () => {
      const payload: PlacementInput[] = items.map((item, i) => ({
        contentId: item.contentId,
        position: i,
        startsAt: item.startsAt ?? undefined,
        endsAt: item.endsAt ?? undefined,
      }));
      const result = await saveCurationAction(surface, payload);
      if (result.ok) {
        showToast("Saved ✓");
      } else {
        showToast(`Error: ${result.error}`);
      }
    });
  }

  return (
    <div className="bg-white border border-line rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[16px] font-serif font-semibold text-ink">{label}</h2>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-3.5 py-1.5 text-[12px] font-medium bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save order"}
        </button>
      </div>
      <p className="text-[12px] text-muted mb-4">{description}</p>

      {/* Toast */}
      {toastMsg && (
        <div className="mb-3 text-[12px] text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {toastMsg}
        </div>
      )}

      {/* Drag list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.contentId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 mb-4">
            {items.length === 0 && (
              <p className="text-[12px] text-muted italic py-4 text-center border border-dashed border-line rounded-lg">
                No featured content. Add pieces below.
              </p>
            )}
            {items.map((item) => (
              <SortableItem
                key={item.contentId}
                item={item}
                surface={surface}
                onRemove={handleRemove}
                onDateChange={handleDateChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add picker */}
      <div className="border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">
          Add content
        </p>
        <input
          type="text"
          value={addSearch}
          onChange={(e) => setAddSearch(e.target.value)}
          placeholder="Search by title…"
          className="w-full border border-line rounded-md px-3 py-1.5 text-[13px] bg-white text-ink placeholder-muted focus:outline-none focus:border-accent mb-2"
        />
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filteredAvailable.slice(0, 20).map((item) => (
            <button
              key={item.id}
              onClick={() => handleAdd(item)}
              className="w-full text-left px-3 py-2 rounded hover:bg-cream transition-colors"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted mr-2">
                {item.kind.replace("_", " ")}
              </span>
              <span className="text-[13px] text-ink">{item.title}</span>
            </button>
          ))}
          {filteredAvailable.length === 0 && (
            <p className="text-[12px] text-muted italic px-3 py-2">
              No matching published content.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Main export — receives serialised data from the server page
 * ------------------------------------------------------------------ */

export interface CurationClientProps {
  signalPlacements: PlacementRow[];
  deepDivePlacements: PlacementRow[];
  heroPlacements: PlacementRow[];
  availableSignals: AvailableContent[];
  availableDeepDives: AvailableContent[];
}

export default function CurationClient({
  signalPlacements,
  deepDivePlacements,
  heroPlacements,
  availableSignals,
  availableDeepDives,
}: CurationClientProps) {
  const allAvailable = [...availableSignals, ...availableDeepDives];

  return (
    <div className="space-y-8">
      <CurationSurface
        surface="home_hero"
        label="Hero — top of homepage"
        description="The single featured piece in the hero banner. Only the first slot is used."
        placements={heroPlacements}
        available={allAvailable}
      />
      <CurationSurface
        surface="home_signals"
        label="Featured Signals"
        description="Signals shown in the homepage Signals strip. Drag to reorder."
        placements={signalPlacements}
        available={availableSignals}
      />
      <CurationSurface
        surface="home_deep_dives"
        label="Featured Deep Dives"
        description="Deep Dives shown in the homepage Deep Dives section. Drag to reorder."
        placements={deepDivePlacements}
        available={availableDeepDives}
      />
    </div>
  );
}
