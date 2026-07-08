export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until at least one token is available again (0 when allowed). */
  retryAfterSec: number;
  /** Whole tokens left in the bucket after this call. */
  remaining: number;
}

/**
 * In-memory token-bucket limiter. Single on-box container → process-global state
 * is enough; no external store. `now` is injected so the refill logic is
 * deterministically testable. Idle buckets are pruned so the map can't grow
 * unbounded from one-off IPs.
 */
export class TokenBucketLimiter {
  private buckets = new Map<string, { tokens: number; last: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
    private readonly idleTtlMs = 10 * 60_000,
    private readonly maxKeys = 20_000,
  ) {}

  check(key: string, nowMs: number): RateLimitResult {
    let b = this.buckets.get(key);
    if (!b) {
      // Hard cap: bound the map even under a flood of distinct source IPs (where
      // idle-based prune frees nothing). Evict oldest-inserted entries — O(1)
      // each, no O(n) scan on the hot path — until there is room. Evicting a live
      // bucket just resets it to full capacity, which is fail-open and harmless.
      while (this.buckets.size >= this.maxKeys) {
        const oldest = this.buckets.keys().next().value;
        if (oldest === undefined) break;
        this.buckets.delete(oldest);
      }
      b = { tokens: this.capacity, last: nowMs };
      this.buckets.set(key, b);
    } else {
      const elapsedSec = Math.max(0, (nowMs - b.last) / 1000);
      b.tokens = Math.min(this.capacity, b.tokens + elapsedSec * this.refillPerSec);
      b.last = nowMs;
    }

    if (b.tokens >= 1) {
      b.tokens -= 1;
      return { allowed: true, retryAfterSec: 0, remaining: Math.floor(b.tokens) };
    }

    const retryAfterSec = Math.max(1, Math.ceil((1 - b.tokens) / this.refillPerSec));
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  /** Drop buckets untouched for longer than the idle TTL. */
  prune(nowMs: number): void {
    for (const [k, v] of this.buckets) {
      if (nowMs - v.last > this.idleTtlMs) this.buckets.delete(k);
    }
  }

  /** Test/introspection helper. */
  size(): number {
    return this.buckets.size;
  }
}

/**
 * Resolve the request's real client IP.
 *
 * Behind a single trusted proxy (Traefik), the CLIENT-supplied prefix of
 * `x-forwarded-for` is spoofable — a flooder could rotate it to mint fresh
 * buckets. The trustworthy signals are `x-real-ip` (which Traefik sets to the
 * real peer) and, failing that, the LAST `x-forwarded-for` hop (the one the
 * trusted proxy appended). We never trust the first hop. Returns "unknown" when
 * no IP header is present (all such requests then share one bucket).
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return hops.length > 0 ? hops[hops.length - 1] : "unknown";
}

/** `${prefix}:${clientIp}` — a per-IP limiter key. */
export function clientKey(req: Request, prefix: string): string {
  return `${prefix}:${clientIp(req)}`;
}

// Shared instances (process-global for the container's lifetime).
//
// RSVP is two-tier so that CGNAT (many KG mobile guests behind one carrier IP)
// doesn't let one busy invite throttle another's guests:
//   - coarse per-IP guard, checked BEFORE body parse — sheds pure floods and
//     malformed spam cheaply. Generous so a whole carrier's legit traffic fits.
//   - fine per-(invite, IP) guard, checked AFTER the slug is validated — the real
//     anti-headcount-corruption limit, scoped to one invite.
export const rsvpIpLimiter = new TokenBucketLimiter(60, 2); // 60 burst, 2/s per IP
export const rsvpInviteLimiter = new TokenBucketLimiter(20, 1 / 3); // 20 burst, 1/3s per (slug,ip)

// Invite creation: per-IP, 20 burst / ~1 per 30s — CGNAT-friendly for organizers
// while still bounding DB-volume growth.
export const inviteLimiter = new TokenBucketLimiter(20, 1 / 30);

// Premium-interest leads: per-IP, 10 burst / ~1 per 30s — a real prospect submits
// once or twice; this bounds junk without throttling legitimate interest.
export const premiumInterestLimiter = new TokenBucketLimiter(10, 1 / 30);
