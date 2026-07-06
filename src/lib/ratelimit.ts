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
      if (this.buckets.size >= this.maxKeys) this.prune(nowMs);
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
 * Derive a limiter key from the request's real client IP.
 *
 * Behind a single trusted proxy (Traefik), the CLIENT-supplied prefix of
 * `x-forwarded-for` is spoofable — a flooder could rotate it to mint fresh
 * buckets. The trustworthy signals are `x-real-ip` (which Traefik sets to the
 * real peer) and, failing that, the LAST `x-forwarded-for` hop (the one the
 * trusted proxy appended). We never trust the first hop.
 */
export function clientKey(req: Request, prefix: string): string {
  let ip = req.headers.get("x-real-ip")?.trim() ?? "";
  if (!ip) {
    const hops = (req.headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    ip = hops.length > 0 ? hops[hops.length - 1] : "";
  }
  return `${prefix}:${ip || "unknown"}`;
}

// Shared instances (process-global for the container's lifetime).
// RSVP: 20-burst, ~1 refill / 3s — generous for a real family answering, brutal
// for a flooder. Invite creation: 10-burst, ~1 / 30s — guards the DB volume.
export const rsvpLimiter = new TokenBucketLimiter(20, 1 / 3);
export const inviteLimiter = new TokenBucketLimiter(10, 1 / 30);
