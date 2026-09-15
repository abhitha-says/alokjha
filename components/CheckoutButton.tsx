"use client";

import { useState } from "react";

/**
 * CheckoutButton
 *
 * Opens the Razorpay Checkout modal for a given plan.
 *
 * Flow:
 *   1. Click → POST /api/checkout (server creates the Razorpay order/subscription
 *      and writes an `orders` row with status = 'created').
 *   2. Razorpay modal opens using the returned order/subscription ID.
 *   3. Reader completes payment → Razorpay calls our webhook.
 *   4. Webhook grants the entitlement and marks the order paid.
 *   5. On Razorpay modal close (success or dismiss), we redirect to /account
 *      so the reader sees their updated access.
 *
 * The `handler` callback is a UI hint only. We do NOT grant access from it.
 * A reader who closes the tab after payment but before the handler fires still
 * gets access because the webhook fires regardless.
 *
 * IMPORTANT: The Razorpay Checkout JS (checkout.razorpay.com/v1/checkout.js)
 * is loaded lazily on first click rather than at page load, to avoid adding
 * a third-party script to every page.
 *
 * Props:
 *   planId     — "deep_dive" | "monthly" | "annual" | "founding"
 *   slug       — required when planId === "deep_dive"
 *   label      — button text, e.g. "Buy Deep Dive ₹299"
 *   className  — optional Tailwind classes
 *   disabled   — optional; used to disable during loading
 */

interface CheckoutButtonProps {
  planId: "deep_dive" | "monthly" | "annual" | "founding";
  slug?: string;
  label: string;
  className?: string;
  disabled?: boolean;
  /** Called when the Razorpay modal closes, regardless of outcome. */
  onDismiss?: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

export function CheckoutButton({
  planId,
  slug,
  label,
  className = "",
  disabled = false,
  onDismiss,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      // 1. Create the Razorpay order / subscription server-side
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // 2. Load the Razorpay Checkout JS lazily
      await loadRazorpayScript();

      // 3. Open Razorpay Checkout
      const options: Record<string, unknown> = {
        key: data.keyId,
        currency: data.currency ?? "INR",
        name: "Human Signals",
        description:
          planId === "deep_dive"
            ? "Deep Dive purchase"
            : planId === "founding"
            ? "Founding Membership"
            : planId === "annual"
            ? "Annual Membership"
            : "Monthly Membership",
        // For one-time payments:
        ...(data.razorpayOrderId && {
          order_id: data.razorpayOrderId,
          amount: data.amountPaise,
        }),
        // For subscriptions:
        ...(data.razorpaySubscriptionId && {
          subscription_id: data.razorpaySubscriptionId,
        }),
        prefill: {},
        theme: { color: "#1c2430" },
        modal: {
          // On close (success or dismiss), redirect to /account
          ondismiss: () => {
            setLoading(false);
            onDismiss?.();
            // The webhook will have fired by the time the reader gets to
            // /account (or will fire shortly after); the page will show their
            // updated entitlements.
            window.location.href = "/account?payment=confirming";
          },
        },
        handler: (response: {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) => {
          // UI hint only — do NOT grant access here. The webhook is the
          // source of truth. Show a "confirming" state and let the redirect
          // in ondismiss handle navigation.
          console.log("[checkout] payment response received", {
            paymentId: response.razorpay_payment_id,
          });
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("[checkout] unexpected error", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        id={`checkout-btn-${planId}${slug ? `-${slug}` : ""}`}
        onClick={handleClick}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Preparing checkout…
          </>
        ) : (
          label
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Lazily loads the Razorpay Checkout JS from checkout.razorpay.com.
 * Resolves immediately if already loaded.
 */
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay Checkout script"));
    document.head.appendChild(script);
  });
}
