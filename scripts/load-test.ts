/**
 * Load test — Deep Dive page at ~10K reads/day peak
 *
 * Phase 6: validates the site can handle the target traffic before payments
 * launch, when reader volume is expected to spike.
 *
 * 10K reads/day, assuming a 1.4-hour morning peak window:
 *   10,000 / (1.4 × 3600) ≈ 2 req/s ≈ 120 req/min
 *
 * We run 120 req/min for 5 minutes (600 total requests) and record the
 * p50, p95, p99 latencies and error rate.
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types scripts/load-test.ts
 *   node --env-file=.env.local --experimental-strip-types scripts/load-test.ts -- --url http://localhost:3000 --rps 2 --duration 60
 *
 * Or against the preview deployment:
 *   LOAD_TEST_URL=https://your-branch.vercel.app node --experimental-strip-types scripts/load-test.ts
 *
 * Baseline (fill in after first run):
 *   Date:     -
 *   URL:      localhost:3000
 *   p50:      - ms
 *   p95:      - ms
 *   p99:      - ms
 *   errors:   -
 *
 * Prerequisites: Node 22+. No external dependencies — uses built-in fetch.
 */

const BASE_URL = process.env.LOAD_TEST_URL ?? "http://localhost:3000";

// The slug to hit. Pick a Deep Dive that is published and returns the full
// cached page — this is the highest-value cache path.
const TARGET_PATH = process.env.LOAD_TEST_PATH ?? "/deep-dives/the-weight-of-certainty";

// Requests per second. Default matches ~10K reads/day morning peak.
const RPS = Number(process.env.LOAD_TEST_RPS ?? "2");

// Duration in seconds.
const DURATION_SECONDS = Number(process.env.LOAD_TEST_DURATION ?? "60");

const url = `${BASE_URL}${TARGET_PATH}`;

console.log(`\nLoad test: ${url}`);
console.log(`Target:    ${RPS} req/s for ${DURATION_SECONDS}s = ${RPS * DURATION_SECONDS} requests\n`);

const latencies: number[] = [];
let errors = 0;

async function fire(): Promise<void> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      headers: {
        // Simulate a browser reading from a warm CDN cache.
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
        "User-Agent": "HumanSignalsLoadTest/1.0",
      },
      // Disable cache so we measure the origin, not a local DNS/OS cache.
      cache: "no-store",
    });
    if (!res.ok) {
      errors++;
      console.error(`  HTTP ${res.status} for ${url}`);
    }
    // Drain the body so the connection is reused.
    await res.text();
  } catch (err) {
    errors++;
    console.error(`  Fetch error: ${err instanceof Error ? err.message : err}`);
  }
  latencies.push(performance.now() - start);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
}

async function run(): Promise<void> {
  const intervalMs = 1000 / RPS;
  const totalRequests = RPS * DURATION_SECONDS;
  let sent = 0;
  const startMs = Date.now();

  await new Promise<void>((resolve) => {
    const timer = setInterval(async () => {
      if (sent >= totalRequests || Date.now() - startMs > DURATION_SECONDS * 1000 + 2000) {
        clearInterval(timer);
        resolve();
        return;
      }
      sent++;
      // Don't await — let them fly concurrently at the given RPS.
      fire();

      if (sent % (RPS * 10) === 0) {
        const elapsed = Math.round((Date.now() - startMs) / 1000);
        console.log(`  ${sent}/${totalRequests} sent (${elapsed}s elapsed, ${errors} errors)`);
      }
    }, intervalMs);
  });

  // Wait for any in-flight requests to complete.
  await new Promise((r) => setTimeout(r, 3000));

  const sorted = [...latencies].sort((a, b) => a - b);

  console.log(`\n── Results ──────────────────────────────────────`);
  console.log(`  Total:  ${latencies.length} responses, ${errors} errors`);
  console.log(`  Error rate: ${((errors / latencies.length) * 100).toFixed(1)}%`);
  console.log(`  p50:  ${percentile(sorted, 50)} ms`);
  console.log(`  p95:  ${percentile(sorted, 95)} ms`);
  console.log(`  p99:  ${percentile(sorted, 99)} ms`);
  console.log(`  Max:  ${Math.round(sorted[sorted.length - 1])} ms`);
  console.log(`─────────────────────────────────────────────────\n`);
  console.log(`Copy the results into the Baseline comment at the top of this file.`);
}

run().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
