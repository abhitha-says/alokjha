# Human Signals — Analytics + Admin Panel Implementation Plan

Status: Phase 0, Phase 2, and Phase 3 implemented. Phase 1 in progress. Written 2026-09-15.

Decisions locked with the client: **Vercel + Supabase**, **Razorpay**, **Auth.js with magic link + Google + password**, **full content migration to Postgres**.

---

## 0. Where the codebase actually stands

Read this before anything else, because two of the assumptions people usually make about this repo are wrong.

| Area | Reality today |
|---|---|
| Content | 50 essays, 55 insights, 5 reports live in three ~100KB–2MB markdown files at the repo root, regex-parsed at runtime by `lib/markdown-content.ts` and cached in module-level variables. There is no database. |
| Auth | None. `lib/access.ts:92` reads an **unsigned, unencrypted JSON cookie** and trusts it. |
| Entitlements | `app/api/dev-session/route.ts` hands out any entitlement you ask for. It 404s in production, so the live site currently has **no way to grant access at all**. |
| Payments | None. `PRICING` in `lib/access.ts:34` is a display constant. |
| Newsletter | `components/SubscribeForm.tsx:22` sets `submitted = true` and throws the email away. **Every subscriber captured so far is lost.** The user is told "check your inbox" and no email is ever sent. |
| Free editions | `FREE_DEEP_DIVE_SLUGS` is a hardcoded array (`lib/access.ts:72`). Releasing a new free Deep Dive currently needs a code deploy. |
| Founding cap | `FOUNDING_MEMBER_LIMIT = 200` is a display constant with nothing enforcing it. |
| Analytics | None. |

The paywall *cut* logic (`buildDeepDivePreview`, `lib/markdown-content.ts:470`) is genuinely good — it truncates server-side and never serialises the locked remainder. That survives this plan untouched. What's missing is everything that decides *who* gets the uncut version.

**Next.js 16 note that will bite you:** `middleware.ts` is deprecated and renamed to **`proxy.ts`**. The proxy function runs on the **Node.js runtime** by default and setting `runtime` in it throws. The Next docs also warn explicitly: Server Actions are POST requests to the route they live on, so a proxy matcher can silently stop covering them. **Auth must be re-verified inside every Server Action, never in the proxy alone.**

---

## Phase 0 — PostHog (ship this on its own, ~1 day)

Independent of everything else. No database, no auth, no risk. Do it first so you start accumulating baseline data while the rest is built — you cannot measure the lift from a paywall you shipped before you had analytics.

### 0.1 Account setup

1. Sign up at `posthog.com`. **Choose the region deliberately** — it cannot be changed later without a migration. US Cloud is the default and lower-latency for most CDN paths; pick **EU Cloud** only if you expect meaningful European readership and want GDPR data residency. For a primarily Indian audience, US Cloud is the pragmatic pick.
2. Create a project named `human-signals`. Create a second project `human-signals-dev` — **never let local development pollute production funnels.**
3. From *Project Settings → Project ID*, copy the **Project API Key** (`phc_...`) and the **API Host**.
4. From *Settings → Personal API Keys*, create a key scoped to *read* for later use in the admin panel's embedded dashboards. Keep this one server-side only.

### 0.2 Environment variables

```bash
# .env.local  (and Vercel → Settings → Environment Variables)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=/ingest          # note: the proxy path, not the PostHog URL
POSTHOG_API_HOST=https://us.i.posthog.com # or https://eu.i.posthog.com
POSTHOG_PERSONAL_API_KEY=phx_xxxxxxxx     # server-only, for admin dashboards
```

The `NEXT_PUBLIC_` prefix exposes a value to the browser. The project API key is *designed* to be public — it is write-only ingestion. The **personal API key is not** and must never get that prefix.

### 0.3 Reverse-proxy the ingestion endpoint

This is the step most people skip and then wonder why their numbers are 30% low. Ad blockers and Brave block `*.posthog.com` by default. Routing ingestion through your own domain fixes it.

Add rewrites in `next.config.mjs`:

```js
const nextConfig = {
  turbopack: { root: import.meta.dirname },
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*',        destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  skipTrailingSlashRedirect: true, // required — PostHog's API is trailing-slash sensitive
}
```

Swap `us` for `eu` throughout if you chose EU Cloud.

### 0.4 Client-side initialisation

Install: `npm i posthog-js posthog-node`

`app/providers.tsx` (new, client component):

```tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      capture_pageview: false,   // App Router: we fire these manually, see 0.5
      capture_pageleave: true,
      person_profiles: 'identified_only', // don't bill for anonymous person profiles
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
    })
  }, [])
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
```

`maskAllInputs: true` is **not optional**. Session replay on a site with a checkout form and an email capture will otherwise record card details and email addresses into a third party. Additionally tag any element rendering a reader's email or entitlement state with `data-ph-mask`.

Wrap `<body>` in `app/layout.tsx` with `<PHProvider>`.

### 0.5 Pageviews under the App Router

`posthog-js` autocapture does not see App Router client-side navigations. Without this, a reader who lands on `/` and reads six Signals registers as one pageview.

`components/PostHogPageView.tsx` (client), rendered inside `PHProvider`:

```tsx
'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'

function Tracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()
  useEffect(() => {
    if (!pathname || !posthog) return
    let url = window.origin + pathname
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, posthog])
  return null
}

// useSearchParams requires a Suspense boundary or it opts the whole route out of prerendering
export default function PostHogPageView() {
  return <Suspense fallback={null}><Tracker /></Suspense>
}
```

### 0.6 The event taxonomy

Decide this now, in one place, or you end up with `signal_read`, `SignalRead` and `read-signal` three months in. Put it in `lib/analytics.ts` as a typed helper so event names are never string literals at call sites.

| Event | Properties | Fires from |
|---|---|---|
| `signal_viewed` | `slug`, `title`, `category`, `reading_time` | Signal page |
| `signal_completed` | `slug`, `scroll_depth`, `dwell_seconds` | Scroll listener at 90% |
| `deep_dive_preview_viewed` | `slug`, `series`, `is_founding`, `preview_words`, `total_words` | Deep Dive page, locked |
| `deep_dive_full_viewed` | `slug`, `access_reason` (`free-edition`/`membership`/`purchased`) | Deep Dive page, unlocked |
| `paywall_hit` | `slug`, `series`, `preview_share` | Paywall component mount |
| `paywall_cta_clicked` | `slug`, `cta` (`buy-single`/`membership`) | Paywall buttons |
| `newsletter_subscribed` | `source_page`, `double_optin_pending` | **Server** |
| `newsletter_confirmed` | `source_page` | **Server** |
| `checkout_started` | `product` (`deep-dive`/`monthly`/`annual`/`founding`), `slug?`, `amount_inr` | Server, on Razorpay order creation |
| `checkout_succeeded` | `product`, `amount_inr`, `payment_id`, `slug?` | **Server, from Razorpay webhook** |
| `checkout_failed` | `product`, `reason` | Server, from webhook |
| `subscription_renewed` / `_cancelled` / `_payment_failed` | `plan`, `amount_inr` | Server, from webhook |
| `search_performed` | `query_length`, `result_count` | `app/api/search/route.ts` |

**Money events fire server-side, from the Razorpay webhook, not from the browser.** A client-side `purchase` event is lost to ad blockers, is lost when the user closes the tab on the success redirect, and is trivially forgeable. Revenue numbers must come from a source you control.

### 0.7 Server-side capture

`lib/posthog-server.ts`:

```ts
import { PostHog } from 'posthog-node'

export const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.POSTHOG_API_HOST!,
  flushAt: 1,        // serverless: no long-lived process to batch into
  flushInterval: 0,
})
```

In route handlers, pair it with `after()` from `next/server` so the flush does not block the response:

```ts
import { after } from 'next/server'
after(async () => {
  posthogServer.capture({ distinctId: userId, event: 'checkout_succeeded', properties: {...} })
  await posthogServer.shutdown()
})
```

### 0.8 Identity stitching

The whole value of this depends on connecting the anonymous reader to the paying member. On successful sign-in, client-side:

```ts
posthog.identify(user.id, { email: user.email, plan: user.plan, signed_up_at: user.createdAt })
```

Use the **internal user ID** as `distinctId`, never the email — emails change and you want one person, one profile. On sign-out call `posthog.reset()` or the next anonymous visitor on a shared machine gets merged into the member's profile. Server-side captures must use the same `distinctId` or the funnel breaks in half.

### 0.9 Funnels and dashboards to build in the PostHog UI

1. **Acquisition → subscriber:** `$pageview` → `signal_viewed` → `newsletter_subscribed` → `newsletter_confirmed`
2. **Reader → payer:** `signal_viewed` → `deep_dive_preview_viewed` → `paywall_hit` → `paywall_cta_clicked` → `checkout_started` → `checkout_succeeded`
3. **Content performance:** `signal_completed` ÷ `signal_viewed` per slug — your actual quality signal, not pageviews
4. **Paywall conversion by slug:** `checkout_succeeded` ÷ `paywall_hit` grouped by `slug` — tells you which Deep Dives justify the ₹299, which is what should drive what gets written next
5. **Retention:** weekly return rate for `newsletter_confirmed` cohorts

Turn on **session replay** but sample it (10%) — full-fidelity replay on every session gets expensive fast and you will never watch 100% of them.

**Deliverable of Phase 0:** analytics live on the current site with no other changes. Verifiable, revertible, useful immediately.

---

## Phase 1 — Data layer, auth, identity (~4–5 days)

### 1.1 Supabase and connection pooling

Create the project in the **Mumbai (ap-south-1)** region — your readers and your Vercel functions should both be near it.

Serverless functions open a connection per invocation. A direct Postgres connection will exhaust the pool under any real traffic. **This is the single most common way a Vercel + Postgres site falls over.**

```bash
# Runtime — Supavisor transaction mode, port 6543. Used by the app.
DATABASE_URL="postgresql://postgres.[ref]:[pw]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Migrations only — direct connection, port 5432. Never used at runtime.
DIRECT_URL="postgresql://postgres.[ref]:[pw]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

Transaction-mode pooling does not support prepared statements — configure the driver accordingly (`prepare: false` on `postgres.js`).

### 1.2 ORM: Drizzle

Recommended over Prisma here: no query-engine binary, materially faster cold starts on Vercel, and SQL-shaped migrations you can actually read in review. `npm i drizzle-orm postgres && npm i -D drizzle-kit`.

### 1.3 Schema

```
users                id, email (citext unique), name, image, password_hash (nullable),
                     email_verified_at, role (reader|editor|admin), created_at, last_seen_at,
                     marketing_consent_at, deleted_at

accounts             Auth.js OAuth table (provider, provider_account_id, tokens)
sessions             Auth.js DB sessions
verification_tokens  Auth.js magic-link tokens

subscribers          id, email (citext unique), user_id (nullable FK), status
                     (pending|confirmed|unsubscribed|bounced), confirm_token,
                     confirmed_at, unsubscribed_at, source_page, utm jsonb, created_at

content              id, kind (signal|deep_dive|report), slug (unique per kind), number,
                     title, subtitle, deck, standfirst, category, body_md, sources_md,
                     teaser, cover_image_url, reading_minutes, word_count,
                     status (draft|scheduled|published|archived), published_at, scheduled_for,
                     is_free_edition bool, preview_share numeric null,
                     seo jsonb, author_id, created_at, updated_at, deleted_at

content_revisions    id, content_id, version int, body_md, title, editor_id, created_at,
                     change_note            -- append-only; never updated

featured_placements  id, content_id, surface (home_hero|home_signals|home_deep_dives),
                     position int, starts_at, ends_at

plans                id (deep_dive|monthly|annual|founding), amount_paise int, interval,
                     razorpay_plan_id, seat_limit int null, active bool
                     -- amount_paise is THE price. The client never sends an amount.

orders               id, user_id, plan_id, content_slug (nullable, for single Deep Dives),
                     amount_paise, currency, status (created|paid|failed|refunded),
                     razorpay_order_id unique, razorpay_payment_id unique nullable,
                     founding_seat_no int null unique,  -- the 200-seat cap, see 1.6
                     created_at, paid_at

subscriptions        id, user_id, plan_id, razorpay_subscription_id unique,
                     status (created|active|past_due|cancelled|expired),
                     current_period_end, grace_until, cancel_at_period_end bool
                     -- monthly and annual only. Founding is a one-time order.

entitlements         id, user_id, kind (membership|deep_dive), content_slug nullable,
                     source_order_id, granted_at, expires_at nullable, revoked_at nullable
                     -- the single table lib/access.ts reads

invoices             id, order_id|subscription_id, number unique, gst_amount_paise,
                     hsn_sac, buyer_state, pdf_url, issued_at

webhook_events       id, provider, provider_event_id unique, type, payload jsonb,
                     signature_valid bool, processed_at, error
                     -- unique constraint = idempotency. See 4.4.

admin_audit_log      id, actor_id, action, target_type, target_id, before jsonb,
                     after jsonb, ip, user_agent, created_at   -- append-only
```

Index rules that matter: `content(kind, status, published_at DESC)` for every listing page; `content(slug)` unique; `entitlements(user_id, kind, content_slug) WHERE revoked_at IS NULL`; `orders(user_id, created_at DESC)`.

**Row Level Security:** enable RLS on every table in Supabase. The app connects as a privileged role through Drizzle, so RLS is defence-in-depth — but it is the difference between "a leaked anon key is embarrassing" and "a leaked anon key is a breach". Deny-by-default, and do not create permissive policies for tables the client never touches directly.

### 1.4 Auth.js v5

`npm i next-auth@beta @auth/drizzle-adapter @node-rs/argon2`

Three providers as agreed:
- **Resend magic link** — primary, no password to leak
- **Google OAuth** — highest-conversion path
- **Credentials (email + password)** — argon2id, min 12 chars, checked against the Have I Been Pwned k-anonymity range API on signup

Configuration that is non-negotiable (L4/S1):

```ts
session: { strategy: 'database', maxAge: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 }
cookies: { sessionToken: { options: { httpOnly: true, sameSite: 'lax', secure: true, path: '/' } } }
```

Database sessions, not JWT. A JWT cannot be revoked — when you cancel a membership or ban an account, a JWT session keeps working until it expires. For a site where the session *is* the entitlement, that is unacceptable.

### 1.5 Rewiring `lib/access.ts`

The file was written for this. Its own comment at line 86 says so. `getEntitlements()` keeps its exact signature and every caller stays untouched:

```ts
export async function getEntitlements(): Promise<Entitlements> {
  const session = await auth()
  if (!session?.user?.id) return ANONYMOUS
  return loadEntitlements(session.user.id)   // one indexed query
}
```

`resolveDeepDiveAccess()` changes only in that `isFreeDeepDive()` reads `content.is_free_edition` instead of the hardcoded array. Then **delete `app/api/dev-session/route.ts`** — it is a production access-granting endpoint guarded only by `NODE_ENV`, and the moment real auth exists it is pure risk.

### 1.6 The 200 founding seats

`FOUNDING_MEMBER_LIMIT = 200` is currently decorative. Enforcing it with `SELECT count(*) < 200` then inserting is a textbook race: two concurrent checkouts both read 199 and you have sold 201 seats you advertised as 200.

Enforce it in the database. `orders.founding_seat_no` is `UNIQUE` with a `CHECK (founding_seat_no BETWEEN 1 AND 200)`, assigned inside the payment transaction. Allocation uses `SELECT ... FOR UPDATE` on a seat-counter row, or simply lets the unique constraint reject the loser and retries. The database is the only thing that can hold this invariant under concurrency.

Because Founding is a one-time purchase, the seat is permanent: a refund frees it, nothing else does. Refunding a Founding order must therefore null the seat number and revoke the entitlement in the same transaction, or you quietly lose a seat you could have sold.

### 1.7 Fixing the newsletter

`SubscribeForm` becomes a Server Action writing to `subscribers` with double opt-in: insert `pending` + token → send confirmation email via Resend → `/api/newsletter/confirm?token=` flips to `confirmed`. Rate-limit by IP and email. Every marketing email carries a one-click unsubscribe link (RFC 8058 `List-Unsubscribe` header) or you will land in spam folders permanently.

Retrofit note: the emails collected so far are gone. Nothing can recover them.

---

## Phase 2 — Content migration, markdown → Postgres (~3 days)

Expand-contract (L9 rung M3). Every step reversible.

**Step 1 — Import script** (`scripts/import-content.ts`). Reuses the existing parsers in `lib/markdown-content.ts` as the reader, writes to `content`. Idempotent: upsert on `(kind, slug)`.

**Step 2 — Parity gate.** The script must fail loudly unless:
- exactly 50 signals, 55 deep dives, 5 reports imported
- **every slug in the DB matches `slugify()` output byte-for-byte**
- body word counts match within 1%
- `is_free_edition = true` for exactly the five slugs in `FREE_DEEP_DIVE_SLUGS`

The slug check is the important one. `slugify()` (`lib/markdown-content.ts:66`) strips `₹`, curly apostrophes and punctuation in a specific order. Any drift breaks every published URL and every inbound link. Diff the two lists; do not eyeball them.

**Step 3 — Dual-read behind a flag.** `CONTENT_SOURCE=markdown|db`. Deploy with `markdown`, flip to `db` in production, flip back instantly if anything is wrong.

**Step 4 — Contract.** After a week clean on `db`: delete the parsers, delete the flag, move the three markdown files to `archive/` (keep them — they are the migration's rollback).

**Caching.** Content pages become `use cache` + `cacheTag('content:' + slug)`. This requires `cacheComponents: true` in `next.config.mjs`, and Cache Components requires the Node.js runtime throughout. Admin publish calls `updateTag(...)` from the Server Action (read-your-own-writes, so the editor sees the change immediately); scheduled publishing calls `revalidateTag(tag, 'max')` from its route handler. Note `revalidateTag` **cannot** be called from `proxy.ts`.

---

## Phase 3 — Admin panel, content management (~5–6 days)

### 3.1 Route protection, done properly

`proxy.ts` at the repo root (**not** `middleware.ts`):

```ts
export const config = { matcher: ['/admin/:path*'] }
```

The proxy does a cheap session-cookie presence check and redirects anonymous users. It is **not** the authorisation boundary. Per the Next 16 docs, Server Actions are POSTs to their own route and a matcher refactor can silently drop coverage.

The real boundary is `requireAdmin()` — called at the top of **every** admin page, every admin Server Action, and every admin route handler. It re-reads the session from the database, re-checks `role`, and writes to `admin_audit_log`. One helper, called everywhere, no exceptions. Additionally:

- **TOTP 2FA mandatory for `role = admin`.** The admin panel can grant free memberships and issue refunds.
- Admin sessions get a shorter `maxAge` (8h) than reader sessions.
- `X-Frame-Options: DENY` and a strict CSP on `/admin/*`.
- **PostHog is disabled on `/admin/*`** — do not pollute product analytics with your own editing sessions, and do not session-replay a screen showing every reader's email.

### 3.2 Content editor

- List view per kind: search, filter by status/category/series, bulk publish/archive
- Editor: markdown textarea with live preview using the existing `components/MarkdownBody.tsx`, so what the editor sees is exactly what ships
- Fields mirroring the schema: title, subtitle/deck, standfirst, category, body, sources, teaser, cover image, SEO title/description/OG image
- **Auto-derived, not typed:** slug (from title, with manual override + a "slug is changing, this breaks the old URL" warning), reading time, word count
- Draft → Scheduled → Published state machine. Scheduling runs off a Vercel Cron hitting an authenticated route handler that publishes anything `scheduled_for <= now()` and calls `revalidateTag`.
- **Revision history**, append-only, with diff view and restore. Non-negotiable for a body of work this size — one bad paste into a 3,000-word Deep Dive is otherwise unrecoverable.
- `is_free_edition` toggle — this is what replaces the hardcoded `FREE_DEEP_DIVE_SLUGS` deploy.
- Per-piece `preview_share` override for the paywall cut.
- Preview-as-locked-reader button, so the editor can see exactly what a non-member sees before publishing.

### 3.3 Image and file uploads

Supabase Storage, private bucket, signed URLs. Validate on the server (L4/S3): **magic-byte sniffing, not the `Content-Type` header or the file extension** — both are attacker-controlled. Allow `image/jpeg|png|webp|avif` only, cap at 5MB, strip EXIF (it carries GPS), re-encode through `sharp` rather than storing the original bytes.

### 3.4 Homepage curation

`featured_placements` replaces the hardcoded `featuredSignalSlugs` in `lib/content.ts:38`. Drag-to-reorder, with scheduled start/end so a feature can be queued.

---

## Phase 4 — Razorpay and real entitlements (~5–6 days)

### 4.1 Products

| Product | Amount | Razorpay mechanism |
|---|---|---|
| One Deep Dive | ₹299 | Orders API, one-time |
| Monthly | ₹199/mo | Subscriptions API + Plan |
| Annual | ₹1,499/yr | Subscriptions API + Plan |
| Founding | ₹999 | **Orders API, one-time. Lifetime access, capped at 200 buyers.** |

> **Confirmed 2026-09-15:** Founding is a single ₹999 payment granting permanent membership — not a recurring plan. It therefore carries no renewal, no dunning and no churn: an `orders` row, an `entitlements` row with `expires_at = NULL`, and a seat number. The subscription machinery applies only to monthly and annual.
>
> The consequence worth stating plainly: 200 × ₹999 is **₹199,800 of one-time revenue against a permanent, unbounded obligation** to keep serving every future Deep Dive to those readers. That is a deliberate trade — it buys the launch — but it must never be modelled as MRR, and the admin dashboard reports it separately from recurring revenue for exactly that reason.

Onboarding: Razorpay account → KYC (PAN, GST, bank proof — allow several days) → enable **Subscriptions** (a separate activation from plain payments) → create Plans in the dashboard → store `razorpay_plan_id` in the `plans` table. Test everything in Test Mode first; test and live keys are separate.

### 4.2 Server-side price truth (L4/S7)

The client sends a **plan ID and nothing else**. The server reads `plans.amount_paise` and creates the Razorpay order from that value. If the amount ever travels from browser to server, someone will buy a ₹1,499 membership for ₹1.

### 4.3 Checkout flow

1. Client POSTs `{ planId, slug? }` to `/api/checkout` → server validates the reader is signed in, looks up the price, creates a Razorpay order, writes `orders` row as `created`, fires `checkout_started`, returns `razorpay_order_id`.
2. Razorpay Checkout opens in the browser.
3. On success Razorpay returns a signature — verify it, but **treat it only as a UI hint.** Show a "confirming your payment" state.
4. **The webhook is the source of truth.** Entitlements are granted there and nowhere else.

A reader who closes the tab on step 3 must still get access. A reader who forges step 3 must not.

### 4.4 Webhook handler — the part that must be right

`app/api/webhooks/razorpay/route.ts`:

- Read the **raw body** with `await request.text()`. Parsing to JSON first and re-stringifying breaks the signature — key order and whitespace are not preserved.
- Verify `X-Razorpay-Signature` as HMAC-SHA256 of the raw body against `RAZORPAY_WEBHOOK_SECRET`, using a **timing-safe comparison**.
- **Idempotency:** insert into `webhook_events` with `provider_event_id UNIQUE`. A duplicate key means already processed — return 200 and stop. Razorpay retries, and without this a retry grants a second entitlement or double-credits an upgrade.
- Grant entitlements and write the order/subscription update in **one transaction**.
- Return 200 fast; do slow work (invoice PDF, receipt email, PostHog capture) in `after()`.
- Handle: `payment.captured`, `payment.failed`, `order.paid`, `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, `refund.processed`.
- Unhandled event types are logged and 200'd, never 500'd — a 500 makes Razorpay retry forever.

Vercel note: webhook routes must be excluded from any proxy matcher and must not require a session.

### 4.5 Business rules already specified in the code

- `UPGRADE_CREDIT_DAYS = 7` — a ₹299 purchase credited against annual membership within 7 days. Implement as a discount at order-creation time, computed server-side from the `orders` table, and record the credit on the new order so the ledger balances.
- `PAYMENT_GRACE_DAYS = 7` — on `subscription.halted`, set `grace_until = now() + 7 days` and keep `membershipActive` true until then. A daily cron sweeps expired grace periods.
- Purchased Deep Dives **never expire**, even after membership lapses (`lib/access.ts:148` already encodes this). Model as `entitlements` rows with `expires_at = NULL`.

### 4.6 GST and invoices

Digital services to Indian consumers attract 18% GST. Invoices need a sequential number, your GSTIN, the buyer's state (place of supply), HSN/SAC code, and the CGST/SGST vs IGST split. Get this reviewed by your accountant — sequential numbering in particular must not have gaps, which means allocating the number inside the payment transaction, not when the PDF renders.

---

## Phase 5 — Admin panel, revenue and readers (~4–5 days)

### 5.1 Dashboard (landing screen)

Revenue today / 7d / 30d · MRR and ARR · active members by plan · **founding seats remaining (live count against the 200)** · new subscribers 7d · failed payments needing attention · content published this month · top 5 Deep Dives by revenue.

### 5.2 Payments

- **Transactions ledger:** every order and subscription charge. Filter by status, plan, date, reader. CSV export for the accountant.
- **Per-payment detail:** reader, product, amount, Razorpay IDs, the webhook events that touched it, the entitlement it granted. When a reader emails "I paid and can't read it", this screen answers it in fifteen seconds.
- **Failed payments / dunning:** who is in grace, when it expires, a "send recovery email" action. Recovering failed renewals is usually the cheapest revenue on the table.
- **Refunds:** initiate through Razorpay's API, revoke the entitlement in the same transaction, require a typed reason, audit-log it.
- **Invoices:** list, download, resend.
- **Reconciliation:** Razorpay settlement vs your ledger, flagging mismatches. Payment-gateway settlements are net of fees and lag by 2–3 days; without this view your revenue number and your bank balance never agree and you won't know which is wrong.
- **Subscription lifecycle:** upcoming renewals, cancellations with reasons, churn rate, and the upgrade-credit window.

### 5.3 Readers

- Searchable list: email, plan, lifetime value, signup date, last seen, newsletter status
- Reader detail: full entitlement list, payment history, content read (from PostHog), support notes
- **Manual grant/revoke** with mandatory reason + audit log — for comps, press, refunds, and apologies
- **Read-only support view** ("what does this reader currently see?") — not session impersonation, which is a liability
- GDPR/DPDP actions: export a reader's data, delete an account. India's DPDP Act makes this a legal obligation, not a nicety.

### 5.4 Newsletter

Subscriber list with confirmed/pending/unsubscribed/bounced states, growth chart, source-page attribution, CSV export, bounce handling. Compose-and-send is deliberately **out of scope** — use a real ESP (Resend Broadcasts, Buttondown, Beehiiv) rather than building deliverability from scratch. That is a BUY, not a BUILD; getting out of spam folders is a years-long reputation problem, not a feature.

### 5.5 Analytics

Embedded PostHog insights via iframe using the personal API key, plus native views PostHog can't give you because they need your database: revenue per piece of content, paywall conversion by slug, preview-share effectiveness. Cross-reference `paywall_hit` against `checkout_succeeded` per Deep Dive — that ratio is the most decision-useful number on the site.

### 5.6 Operations

Audit log viewer (who changed what, when, from where) · admin user management with roles (`admin` full, `editor` content-only) · a small set of feature flags · webhook event log with manual replay · system health (DB latency, last cron run, Razorpay API status).

---

## Phase 6 — Hardening (~2–3 days)

Rate limiting on auth, checkout, search and newsletter (Upstash Redis, or Postgres if you want one fewer dependency) · security headers and CSP · Supabase point-in-time recovery enabled and a restore **actually tested** · Sentry · a load test of the Deep Dive page at 10K reads/day · a full read-only security pass over auth, entitlements and webhooks.

---

## Suggestions you didn't ask for, ranked by what they're worth

**Build these:**
1. **Preview-as-locked-reader.** One button. Prevents the single worst publishing mistake — shipping a paid Deep Dive whose preview gives away the argument.
2. **Revision history with restore.** Cheap now, priceless the first time a paste goes wrong.
3. **Reconciliation view.** Without it you will not know whether your revenue number is real.
4. **Manual entitlement grant.** You will need it in week one for press, friends, and the first support ticket.
5. **Content scheduling.** A weekly Signal cadence without scheduling means someone publishes manually every single week forever.
6. **Per-slug paywall conversion.** Tells you what to write next. This is the report that changes decisions.
7. **Dunning.** Failed-renewal recovery is the highest-ROI screen in any subscription business.

**Don't build these yet (L11 — no evidence of demand):**
- A/B testing framework — use PostHog feature flags, they're already there
- Comments/community — a separate product with a moderation cost
- A mobile app — the site is already responsive
- Recommendation ML — 110 pieces is not enough data; category + recency beats it
- An email composer — see 5.4
- Multi-author workflows — you have one author

---

## Sequencing and effort

| Phase | Days | Ships independently? | Blocks |
|---|---|---|---|
| 0 · PostHog | 1 | **Yes** | nothing |
| 1 · DB + auth | 4–5 | Yes (auth without paywall) | 2, 3, 4 |
| 2 · Content migration | 3 | Yes (invisible to readers) | 3 |
| 3 · Admin content | 5–6 | Yes | — |
| 4 · Razorpay | 5–6 | Yes | 5 |
| 5 · Admin revenue | 4–5 | Yes | — |
| 6 · Hardening | 2–3 | Yes | — |

**24–29 working days.** Razorpay KYC runs in parallel — start it on day one, it is the longest-lead external dependency.

---

## Risks, honestly

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Slug drift in migration breaks every URL | Medium | **High** — every inbound link and share dies | Byte-exact slug parity gate, blocking |
| Webhook replay double-grants entitlements | Medium | High | `provider_event_id` unique constraint |
| Founding seats oversold past 200 | Medium | Medium — public promise broken | DB unique constraint, not a count query |
| Serverless connection exhaustion | **High if unaddressed** | High — site down under load | Supavisor transaction pooler, `connection_limit=1` |
| Server Action escapes proxy auth | Medium | **Critical** — admin actions exposed | `requireAdmin()` inside every action; documented Next 16 footgun |
| Session replay captures card/email data | High if unaddressed | **Critical** — PII to a third party | `maskAllInputs`, PostHog off on `/admin/*` |
| GST invoicing wrong | Medium | Medium — compliance exposure | Accountant review before go-live |
| Razorpay Subscriptions activation delayed | Medium | Medium — blocks Phase 4 | Start KYC day one |

---

## Open questions

1. ~~Is Founding recurring or one-time?~~ **Answered 2026-09-15: one-time ₹999, lifetime.**
2. **Is the business GST-registered?** Determines whether invoices carry GST from day one. Needed before Phase 4 ships, not before it starts.
3. **Which ESP for transactional + newsletter email?** The plan assumes Resend for both. Needed in Phase 1 for magic-link delivery.
4. **Who gets `role = admin` vs `role = editor`?** Determines whether the role split is worth building in Phase 3 or can wait. Building it regardless — it costs one column and removes a migration later.
