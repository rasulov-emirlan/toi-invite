import { describe, expect, it } from "vitest";
import {
  PREMIUM_TIERS,
  PREMIUM_LIMITS,
  formatSom,
  getTier,
  isOrderableTier,
  normalizeKgPhone,
  validatePremiumInterest,
} from "../premium";
import { LOCALES } from "../i18n";
import type { PremiumInterestInput } from "../types";

describe("premium tier config", () => {
  it("has unique keys and includes the free + two paid tiers", () => {
    const keys = PREMIUM_TIERS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("free");
    expect(keys).toContain("premium");
    expect(keys).toContain("pro");
  });

  it("marks only paid tiers orderable, and free at 0 som", () => {
    const free = getTier("free");
    expect(free.orderable).toBe(false);
    expect(free.priceSom).toBe(0);
    for (const t of PREMIUM_TIERS.filter((x) => x.orderable)) {
      expect(t.priceSom).toBeGreaterThan(0);
    }
  });

  it("provides names, taglines and features in both locales", () => {
    for (const t of PREMIUM_TIERS) {
      for (const loc of LOCALES) {
        expect(t.names[loc]?.trim().length, `${t.key} name ${loc}`).toBeGreaterThan(0);
        expect(t.tagline[loc]?.trim().length, `${t.key} tagline ${loc}`).toBeGreaterThan(0);
        expect(t.features[loc]?.length, `${t.key} features ${loc}`).toBeGreaterThan(0);
        for (const f of t.features[loc]) {
          expect(f.trim().length, `${t.key} feature ${loc}`).toBeGreaterThan(0);
        }
      }
      // feature lists must be parallel across locales
      expect(t.features.ru.length, `${t.key} feature parity`).toBe(t.features.ky.length);
    }
  });

  it("highlights exactly one popular tier", () => {
    expect(PREMIUM_TIERS.filter((t) => t.popular)).toHaveLength(1);
  });
});

describe("formatSom", () => {
  it("groups thousands deterministically (no ICU, no hydration mismatch)", () => {
    expect(formatSom(990)).toBe("990");
    expect(formatSom(1490)).toBe("1 490");
    expect(formatSom(0)).toBe("0");
    expect(formatSom(1000000)).toBe("1 000 000");
  });
});

describe("isOrderableTier", () => {
  it("accepts paid tiers, rejects free and garbage", () => {
    expect(isOrderableTier("premium")).toBe(true);
    expect(isOrderableTier("pro")).toBe(true);
    expect(isOrderableTier("free")).toBe(false);
    expect(isOrderableTier("platinum")).toBe(false);
    expect(isOrderableTier(undefined)).toBe(false);
    expect(isOrderableTier(3)).toBe(false);
  });
});

describe("normalizeKgPhone", () => {
  it("normalizes the forms people actually type to +996XXXXXXXXX", () => {
    for (const raw of [
      "+996 555 12 34 56",
      "996555123456",
      "0555 123456",
      "555123456",
      "+996 (555) 12-34-56",
      "  0555123456  ",
    ]) {
      expect(normalizeKgPhone(raw), raw).toBe("+996555123456");
    }
  });

  it("accepts all plausible operator/area first digits (2–9)", () => {
    expect(normalizeKgPhone("700112233")).toBe("+996700112233");
    expect(normalizeKgPhone("312881122")).toBe("+996312881122");
    expect(normalizeKgPhone("999000111")).toBe("+996999000111");
  });

  it("rejects malformed, too-short/long, and junk numbers", () => {
    for (const bad of [
      "",
      "12345",
      "5551234567", // 10 digits, no leading 0
      "000000000", // leading 0 national part
      "111111111", // leading 1 national part
      "+996 555 12 34", // too short after country code
      "abc",
      "99655512345", // 11 digits
    ]) {
      expect(normalizeKgPhone(bad), bad).toBeNull();
    }
  });
});

describe("validatePremiumInterest", () => {
  const good: PremiumInterestInput = {
    tier: "premium",
    name: "Азамат",
    phone: "0555 12 34 56",
    locale: "ru",
    comment: "Свадьба в сентябре",
  };

  it("accepts a valid request, trims name and normalizes phone", () => {
    const res = validatePremiumInterest({ ...good, name: "  Азамат  " });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.name).toBe("Азамат");
      expect(res.value.phone).toBe("+996555123456");
      expect(res.value.tier).toBe("premium");
      expect(res.value.comment).toBe("Свадьба в сентябре");
    }
  });

  it("treats a blank comment as optional (null)", () => {
    const res = validatePremiumInterest({ ...good, comment: "   " });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.comment).toBeNull();
  });

  it("rejects the free tier and unknown tiers", () => {
    for (const tier of ["free", "platinum", ""]) {
      const res = validatePremiumInterest({ ...good, tier });
      expect(res.ok, `tier ${tier}`).toBe(false);
      if (!res.ok) expect(res.errors).toContain("tier");
    }
  });

  it("requires a name and a valid KG phone", () => {
    const noName = validatePremiumInterest({ ...good, name: "   " });
    expect(noName.ok).toBe(false);
    if (!noName.ok) expect(noName.errors).toContain("name");

    const badPhone = validatePremiumInterest({ ...good, phone: "12345" });
    expect(badPhone.ok).toBe(false);
    if (!badPhone.ok) expect(badPhone.errors).toContain("phone");
  });

  it("rejects a non-object body (null / primitive) without throwing", () => {
    for (const bad of [null, undefined, 42, "x", true, []]) {
      const res = validatePremiumInterest(bad as unknown as PremiumInterestInput);
      expect(res.ok, `body ${JSON.stringify(bad)}`).toBe(false);
      if (!res.ok) expect(res.errors).toContain("body");
    }
  });

  it("rejects a bad locale and an over-long comment", () => {
    const res = validatePremiumInterest({
      ...good,
      locale: "en",
      comment: "x".repeat(PREMIUM_LIMITS.comment + 1),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toContain("locale");
      expect(res.errors).toContain("comment");
    }
  });
});
