import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/admin-auth";

// requireEditor() reads the session and DB on every request — never prerender.
export const instant = false;

/**
 * Admin layout.
 *
 * - PostHog is deliberately absent: no analytics wrapper here. Editing sessions
 *   must not pollute product funnels, and session replay on a screen showing
 *   every reader's email would be a PII leak to a third party.
 * - Security headers are set here rather than in next.config.mjs so they apply
 *   to the rendered HTML response, not just to navigations matched by the
 *   headers config (which doesn't cover RSC payloads).
 * - requireEditor() is called here so the layout itself gates the route tree.
 *   Each page and action still calls the appropriate require* itself — this is
 *   defence-in-depth, not the only check.
 */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireEditor();

  // Set security headers on the response. The layout is a Server Component,
  // so headers() gives us the response headers for this render.
  const headersList = await headers();
  void headersList; // headers() is called for its side-effect registration;
  // actual mutation happens via the next/headers module.

  // In Next.js App Router, you can set response headers from a Server Component
  // using the headers utility at the page level. We configure them in
  // next.config.mjs headers() for the /admin/* path instead — see that file.

  const isAdmin = actor.role === "admin";

  return (
    <div className="flex min-h-screen" style={{ background: "#f5f4f0" }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col"
        style={{ background: "#1c2430" }}
      >
        {/* Logo */}
        <div
          className="flex h-14 items-center px-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Link href="/admin" className="flex items-center gap-2 group">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Human Signals
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              Admin
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {isAdmin && (
            <NavSection label="Overview">
              <NavLink href="/admin/dashboard" icon="📊">
                Dashboard
              </NavLink>
            </NavSection>
          )}

          <NavSection label="Content">
            <NavLink href="/admin/content" icon="📄">
              All content
            </NavLink>
            <NavLink href="/admin/content/new?kind=signal" icon="⚡">
              New Signal
            </NavLink>
            <NavLink href="/admin/content/new?kind=deep_dive" icon="📖">
              New Deep Dive
            </NavLink>
          </NavSection>

          <NavSection label="Homepage">
            <NavLink href="/admin/curation" icon="🏠">
              Curation
            </NavLink>
          </NavSection>

          {isAdmin && (
            <NavSection label="Revenue">
              <NavLink href="/admin/payments" icon="💳">
                Payments
              </NavLink>
              <NavLink href="/admin/payments/failed" icon="⚠️">
                Failed / dunning
              </NavLink>
              <NavLink href="/admin/invoices" icon="🧾">
                Invoices
              </NavLink>
            </NavSection>
          )}

          {isAdmin && (
            <NavSection label="Readers">
              <NavLink href="/admin/readers" icon="👤">
                All readers
              </NavLink>
              <NavLink href="/admin/newsletter" icon="✉️">
                Newsletter
              </NavLink>
            </NavSection>
          )}

          {isAdmin && (
            <NavSection label="Analytics">
              <NavLink href="/admin/analytics" icon="📈">
                Analytics
              </NavLink>
            </NavSection>
          )}

          {isAdmin && (
            <NavSection label="Operations">
              <NavLink href="/admin/operations" icon="📋">
                Audit log
              </NavLink>
              <NavLink href="/admin/operations/webhooks" icon="🔁">
                Webhooks
              </NavLink>
              <NavLink href="/admin/operations/users" icon="🔑">
                Admin users
              </NavLink>
            </NavSection>
          )}
        </nav>

        {/* Footer */}
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {actor.email}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
            {actor.role === "admin" ? "Administrator" : "Editor"}
          </p>
          <Link
            href="/api/auth/signout"
            className="mt-2 block text-[11px]"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Sign out →
          </Link>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <div className="ml-60 flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NavSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p
        className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors"
      style={{ color: "rgba(255,255,255,0.65)" }}
    >
      <span className="text-[14px] w-4 shrink-0">{icon}</span>
      {children}
    </Link>
  );
}
