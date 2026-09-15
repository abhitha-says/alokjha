/**
 * Every admin page opts out of `instant` (see AGENTS.md / each page's
 * `export const instant = false`) because requireEditor()/requireAdmin()
 * re-reads the session from the DB on every request and must never be
 * skipped or cached. That means navigations always block on the server.
 *
 * This file is the mitigation: Next.js wraps every route under /admin in a
 * Suspense boundary keyed to this fallback, so a section switch paints
 * immediately instead of leaving the previous page frozen for the full
 * auth + data round trip.
 */
export default function AdminLoading() {
  return (
    <div className="px-8 py-8 animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-40 rounded bg-line/70" />
        <div className="h-3.5 w-56 rounded bg-line/50 mt-2.5" />
      </div>

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <div className="h-9 border-b border-line bg-cream" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-11 border-b border-line last:border-0 flex items-center px-4"
          >
            <div className="h-3 w-full max-w-xs rounded bg-line/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
