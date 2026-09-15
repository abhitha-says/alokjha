/**
 * Seeds the `plans` table — the server-side source of truth for every price.
 *
 * Run once after migrating, and again whenever a price changes:
 *   npm run db:seed
 *
 * Idempotent: upserts on the primary key, so it is safe to re-run.
 *
 * The amounts here must agree with PRICING in lib/access.ts, which is what the
 * marketing pages render. They are checked against each other at the bottom of
 * this file rather than trusted, because a site that advertises ₹1,499 and
 * charges ₹1,999 is a chargeback and a complaint, not a bug report.
 */

import postgres from "postgres";
import { PRICING, FOUNDING_MEMBER_LIMIT } from "../lib/pricing.ts";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set.");

const rupeesToPaise = (rupees: number) => rupees * 100;

const SEED = [
  {
    id: "deep_dive" as const,
    label: "One Deep Dive",
    amountPaise: rupeesToPaise(PRICING.deepDive.amount),
    interval: "one_time" as const,
    seatLimit: null,
  },
  {
    id: "monthly" as const,
    label: "Monthly membership",
    amountPaise: rupeesToPaise(PRICING.monthly.amount),
    interval: "monthly" as const,
    seatLimit: null,
  },
  {
    id: "annual" as const,
    label: "Annual membership",
    amountPaise: rupeesToPaise(PRICING.annual.amount),
    interval: "yearly" as const,
    seatLimit: null,
  },
  {
    // One payment, permanent access, first 200 buyers only. Not a
    // subscription: no renewal, no dunning, and it must never reach the MRR
    // line on the admin dashboard.
    id: "founding" as const,
    label: "Founding Membership",
    amountPaise: rupeesToPaise(PRICING.founding.amount),
    interval: "one_time" as const,
    seatLimit: FOUNDING_MEMBER_LIMIT,
  },
];

// Raw SQL rather than Drizzle: this script runs under Node's type stripper,
// which cannot resolve the extensionless imports the schema modules use for
// Next. Four upserts do not justify a bundler in the toolchain.
const sql = postgres(url, { max: 1, prepare: false });

for (const plan of SEED) {
  await sql`
    insert into plans (id, label, amount_paise, currency, interval, seat_limit, active)
    values (
      ${plan.id}::plan_id, ${plan.label}, ${plan.amountPaise}, 'INR',
      ${plan.interval}::plan_interval, ${plan.seatLimit}, true
    )
    on conflict (id) do update set
      label        = excluded.label,
      amount_paise = excluded.amount_paise,
      interval     = excluded.interval,
      seat_limit   = excluded.seat_limit
  `;

  console.log(
    `  ${plan.id.padEnd(10)} ₹${(plan.amountPaise / 100).toLocaleString("en-IN")}` +
      `${plan.seatLimit ? `  (${plan.seatLimit} seats)` : ""}`
  );
}

console.log(`\nSeeded ${SEED.length} plans.`);
await sql.end();
