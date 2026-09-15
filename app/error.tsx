"use client";

import { useEffect } from "react";

/**
 * Root error boundary for unhandled errors in the React tree.
 *
 * This catches rendering errors in all routes except the root layout itself
 * (which is covered by global-error.tsx). When Sentry is installed, replace
 * the console.error call with:
 *
 *   import * as Sentry from "@sentry/nextjs";
 *   Sentry.captureException(error);
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console until @sentry/nextjs is installed.
    // When Sentry is wired up, replace with Sentry.captureException(error).
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
          color: "var(--color-ink, #1a1a1a)",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          color: "var(--color-ink-muted, #6b7280)",
          marginBottom: "1.5rem",
          maxWidth: "40ch",
          lineHeight: 1.6,
        }}
      >
        An unexpected error occurred. The problem has been logged and will be
        looked at.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1.5rem",
          background: "var(--color-ink, #1a1a1a)",
          color: "#fff",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        Try again
      </button>
      {error.digest && (
        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.75rem",
            color: "var(--color-ink-muted, #9ca3af)",
            fontFamily: "monospace",
          }}
        >
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
