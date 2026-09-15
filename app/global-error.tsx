"use client";

import { useEffect } from "react";

/**
 * Global error boundary — catches errors in the root layout itself.
 *
 * This is the last-resort handler. It replaces the entire document, including
 * the <html> and <body> tags, so fonts and global styles are unavailable.
 * Keep the markup self-contained.
 *
 * Next.js docs: https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console until @sentry/nextjs is installed.
    // When Sentry is wired up, replace with Sentry.captureException(error).
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#fafaf8",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            color: "#1a1a1a",
          }}
        >
          Human Signals — Something went wrong
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginBottom: "1.5rem",
            maxWidth: "40ch",
            lineHeight: 1.6,
          }}
        >
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Refresh
        </button>
        {error.digest && (
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.75rem",
              color: "#9ca3af",
              fontFamily: "monospace",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
