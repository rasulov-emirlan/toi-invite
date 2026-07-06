import { describe, expect, it } from "vitest";
import { TokenBucketLimiter, clientIp, clientKey } from "../ratelimit";

describe("TokenBucketLimiter", () => {
  it("allows up to capacity, then blocks", () => {
    const rl = new TokenBucketLimiter(3, 1); // 3 burst, 1/sec
    const t = 1_000_000;
    expect(rl.check("k", t).allowed).toBe(true);
    expect(rl.check("k", t).allowed).toBe(true);
    expect(rl.check("k", t).allowed).toBe(true);
    const blocked = rl.check("k", t);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(blocked.remaining).toBe(0);
  });

  it("refills over elapsed time", () => {
    const rl = new TokenBucketLimiter(2, 1); // 1 token/sec
    const t = 1_000_000;
    rl.check("k", t);
    rl.check("k", t); // bucket empty
    expect(rl.check("k", t).allowed).toBe(false);
    // 2 seconds later → 2 tokens back (capped at capacity)
    expect(rl.check("k", t + 2000).allowed).toBe(true);
    expect(rl.check("k", t + 2000).allowed).toBe(true);
    expect(rl.check("k", t + 2000).allowed).toBe(false);
  });

  it("computes a sane retry-after from the refill rate", () => {
    const rl = new TokenBucketLimiter(1, 1 / 3); // 1 token per 3s
    const t = 1_000_000;
    expect(rl.check("k", t).allowed).toBe(true);
    const blocked = rl.check("k", t);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(3);
  });

  it("keeps separate keys independent", () => {
    const rl = new TokenBucketLimiter(1, 1);
    const t = 1_000_000;
    expect(rl.check("a", t).allowed).toBe(true);
    expect(rl.check("b", t).allowed).toBe(true); // different key, own bucket
    expect(rl.check("a", t).allowed).toBe(false);
  });

  it("prunes idle buckets", () => {
    const rl = new TokenBucketLimiter(1, 1, 1000); // 1s idle TTL
    const t = 1_000_000;
    rl.check("a", t);
    rl.check("b", t);
    expect(rl.size()).toBe(2);
    rl.prune(t + 2000); // both idle > 1s
    expect(rl.size()).toBe(0);
  });

  it("hard-caps the map under a distinct-key flood (bounded memory)", () => {
    // idleTtl huge so idle-prune can't help; only the hard cap bounds it
    const rl = new TokenBucketLimiter(1, 1, 60 * 60_000, 5); // maxKeys = 5
    const t = 1_000_000;
    for (let i = 0; i < 1000; i++) rl.check(`ip-${i}`, t); // all "fresh", none idle
    expect(rl.size()).toBeLessThanOrEqual(5);
  });
});

describe("clientKey", () => {
  it("prefers x-real-ip over the XFF last hop (proves precedence)", () => {
    const req = new Request("http://x/", {
      headers: {
        "x-real-ip": "203.0.113.7",
        // a DIFFERENT last hop — if XFF-last won, the key would end in .9
        "x-forwarded-for": "6.6.6.6, 198.51.100.9",
      },
    });
    expect(clientKey(req, "rsvp")).toBe("rsvp:203.0.113.7");
  });

  it("uses the LAST x-forwarded-for hop when x-real-ip is absent", () => {
    // "spoofed, realClient" — the trusted proxy appended the real one last
    const req = new Request("http://x/", {
      headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.7" },
    });
    expect(clientKey(req, "rsvp")).toBe("rsvp:203.0.113.7");
  });

  it("cannot be split into new buckets by rotating the first XFF hop", () => {
    const a = new Request("http://x/", {
      headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.7" },
    });
    const b = new Request("http://x/", {
      headers: { "x-forwarded-for": "2.2.2.2, 203.0.113.7" },
    });
    expect(clientKey(a, "rsvp")).toBe(clientKey(b, "rsvp"));
  });

  it("falls back to a single 'unknown' key when no IP headers are present", () => {
    const req = new Request("http://x/");
    expect(clientKey(req, "invite")).toBe("invite:unknown");
  });
});

describe("clientIp (bare IP for composing per-invite keys)", () => {
  it("returns the real IP, ignoring the spoofable XFF prefix", () => {
    const req = new Request("http://x/", {
      headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.7" },
    });
    expect(clientIp(req)).toBe("203.0.113.7");
    // composes into a per-invite key
    expect(`rsvp:abcd2345:${clientIp(req)}`).toBe("rsvp:abcd2345:203.0.113.7");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    expect(clientIp(new Request("http://x/"))).toBe("unknown");
  });
});
