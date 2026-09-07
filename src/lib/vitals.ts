/**
 * Core Web Vitals plumbing shared by the beacon endpoint and the admin panel.
 * No third-party analytics: guests here are on cheap Androids inside the
 * WhatsApp WebView, and a SaaS tag is both a privacy leak and one more thing
 * to block the page on. Samples land in SQLite next to the product events.
 */

/** The three Core Web Vitals. FCP/TTFB are diagnostic noise we would not act
 *  on, so they are dropped at the door rather than stored. */
export const VITAL_METRICS = ["LCP", "INP", "CLS"] as const;
export type VitalMetric = (typeof VITAL_METRICS)[number];

/**
 * Which page *shape* a sample came from — the only dimension worth splitting
 * by, because the invite page (hero art, countdown) and the builder (a long
 * form) fail in completely different ways. Never the raw path: invite slugs
 * carry family names, and storing them would turn this table into a visit log.
 */
export const VITAL_SURFACES = ["landing", "create", "invite", "premium", "other"] as const;
export type VitalSurface = (typeof VITAL_SURFACES)[number];

/** Guards against a stuck client or a curl loop writing absurd values. */
export const VITAL_MAX_VALUE = 120_000;

export function isVitalMetric(v: unknown): v is VitalMetric {
  return typeof v === "string" && (VITAL_METRICS as readonly string[]).includes(v);
}

export function isVitalSurface(v: unknown): v is VitalSurface {
  return typeof v === "string" && (VITAL_SURFACES as readonly string[]).includes(v);
}

/** Path → surface. Kept pure so the mapping is unit-tested rather than eyeballed. */
export function surfaceForPath(pathname: string): VitalSurface {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/create")) return "create";
  if (pathname.startsWith("/premium")) return "premium";
  // /demo renders the very same InviteCard a guest sees, so it belongs with
  // the invite surface rather than in the "other" bucket.
  if (pathname.startsWith("/i/") || pathname === "/demo") return "invite";
  return "other";
}

/** Google's "good" / "needs improvement" thresholds; above the second is poor.
 *  CLS is unitless, LCP and INP are milliseconds. */
export const VITAL_THRESHOLDS: Record<VitalMetric, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
};

export type VitalRating = "good" | "needs-improvement" | "poor";

export function rateVital(metric: VitalMetric, value: number): VitalRating {
  const t = VITAL_THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

/** Human-readable p75 — ms for the timing metrics, 3 decimals for CLS. */
export function formatVital(metric: VitalMetric, value: number): string {
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}
