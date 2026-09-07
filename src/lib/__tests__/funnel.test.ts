import { describe, expect, it } from "vitest";
import { FUNNEL, computeFunnel, formatRate, kFactor } from "../funnel";
import {
  VITAL_METRICS,
  VITAL_SURFACES,
  formatVital,
  isVitalMetric,
  isVitalSurface,
  rateVital,
  surfaceForPath,
} from "../vitals";

describe("computeFunnel", () => {
  const counts = {
    landing_view: 200,
    create_opened: 80,
    invite_created: 20,
    share_click: 18,
    invite_view: 400,
    rsvp_submitted: 120,
    premium_view: 30,
    payment_started: 6,
    payment_succeeded: 3,
  };

  it("returns one row per step, in order", () => {
    const rows = computeFunnel(counts);
    expect(rows.map((r) => r.event)).toEqual(FUNNEL.map((s) => s.event));
  });

  it("divides each step by the previous one and by the top", () => {
    const rows = computeFunnel(counts);
    const created = rows.find((r) => r.event === "invite_created")!;
    expect(created.fromPrev).toBeCloseTo(20 / 80);
    expect(created.fromTop).toBeCloseTo(20 / 200);
  });

  it("leaves the first step without a previous-step ratio", () => {
    expect(computeFunnel(counts)[0].fromPrev).toBeNull();
  });

  it("lets a guest step exceed the organizer step above it", () => {
    // Guests arrive straight on an invite link, so this is real traffic, not
    // a miscount — the ratio is allowed above 1.
    const views = computeFunnel(counts).find((r) => r.event === "invite_view")!;
    expect(views.fromPrev).toBeGreaterThan(1);
  });

  it("treats a missing event as zero rather than undefined", () => {
    const rows = computeFunnel({ landing_view: 10 });
    expect(rows.find((r) => r.event === "payment_succeeded")!.visitors).toBe(0);
  });

  it("reports no ratio at all when nothing has happened yet", () => {
    for (const row of computeFunnel({})) {
      expect(row.fromTop).toBeNull();
      expect(row.fromPrev).toBeNull();
    }
  });

  it("does not divide by a zero step", () => {
    const rows = computeFunnel({ landing_view: 5, create_opened: 0, invite_created: 2 });
    expect(rows.find((r) => r.event === "invite_created")!.fromPrev).toBeNull();
  });
});

describe("kFactor", () => {
  it("is the share of invites born from another invite", () => {
    expect(kFactor(10, 4)).toBeCloseTo(0.4);
  });

  it("is unknown, not zero, before the first invite exists", () => {
    expect(kFactor(0, 0)).toBeNull();
  });
});

describe("formatRate", () => {
  it("shows a dash for an unknown rate", () => {
    expect(formatRate(null)).toBe("—");
  });

  it("keeps a decimal for the small rates that matter most", () => {
    expect(formatRate(0.015)).toBe("1.5%");
    expect(formatRate(0.42)).toBe("42%");
  });
});

describe("vitals", () => {
  it("accepts only the three Core Web Vitals", () => {
    for (const m of VITAL_METRICS) expect(isVitalMetric(m)).toBe(true);
    expect(isVitalMetric("TTFB")).toBe(false);
    expect(isVitalMetric(null)).toBe(false);
  });

  it("accepts only known surfaces", () => {
    for (const s of VITAL_SURFACES) expect(isVitalSurface(s)).toBe(true);
    expect(isVitalSurface("/i/abc123")).toBe(false);
  });

  it("maps paths to surfaces without ever keeping a slug", () => {
    expect(surfaceForPath("/")).toBe("landing");
    expect(surfaceForPath("/create")).toBe("create");
    expect(surfaceForPath("/premium")).toBe("premium");
    expect(surfaceForPath("/i/abc123")).toBe("invite");
    expect(surfaceForPath("/demo")).toBe("invite");
    expect(surfaceForPath("/admin/stats")).toBe("other");
  });

  it("rates against Google's thresholds", () => {
    expect(rateVital("LCP", 2500)).toBe("good");
    expect(rateVital("LCP", 2501)).toBe("needs-improvement");
    expect(rateVital("LCP", 4001)).toBe("poor");
    expect(rateVital("CLS", 0.1)).toBe("good");
    expect(rateVital("INP", 600)).toBe("poor");
  });

  it("formats CLS unitless and the timings in ms", () => {
    expect(formatVital("CLS", 0.0834)).toBe("0.083");
    expect(formatVital("LCP", 2499.6)).toBe("2500 ms");
  });
});
