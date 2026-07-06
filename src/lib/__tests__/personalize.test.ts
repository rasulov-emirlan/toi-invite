import { describe, expect, it } from "vitest";
import { MAX_GUEST_NAME, personalLink, sanitizeGuestName } from "../personalize";

describe("sanitizeGuestName", () => {
  it("keeps normal Cyrillic names with spaces and punctuation", () => {
    expect(sanitizeGuestName("Айбек байке")).toBe("Айбек байке");
    expect(sanitizeGuestName("Гүлнара эже")).toBe("Гүлнара эже");
    expect(sanitizeGuestName("Нур-Султан")).toBe("Нур-Султан");
    expect(sanitizeGuestName("O'Brien")).toBe("O'Brien");
  });

  it("trims and collapses whitespace", () => {
    expect(sanitizeGuestName("  Айбек   байке  ")).toBe("Айбек байке");
  });

  it("strips angle brackets and other unsafe characters", () => {
    expect(sanitizeGuestName("<script>Айбек")).toBe("script Айбек".replace(/\s+/g, " "));
    expect(sanitizeGuestName("Айбек & Co")).toBe("Айбек Co");
    expect(sanitizeGuestName('Ай"бек')).toBe("Ай бек");
  });

  it("returns empty string for junk / non-strings", () => {
    expect(sanitizeGuestName("   ")).toBe("");
    expect(sanitizeGuestName("<>")).toBe("");
    expect(sanitizeGuestName(undefined as unknown)).toBe("");
    expect(sanitizeGuestName(42 as unknown)).toBe("");
  });

  it("caps the length", () => {
    const long = "Я".repeat(100);
    expect(sanitizeGuestName(long).length).toBe(MAX_GUEST_NAME);
  });
});

describe("personalLink", () => {
  it("builds an encoded ?to= link", () => {
    expect(personalLink("https://toi.night.enkiduck.com", "abcd2345", "Айбек байке")).toBe(
      "https://toi.night.enkiduck.com/i/abcd2345?to=%D0%90%D0%B9%D0%B1%D0%B5%D0%BA%20%D0%B1%D0%B0%D0%B9%D0%BA%D0%B5",
    );
  });

  it("falls back to the plain invite URL when the name sanitizes to empty", () => {
    expect(personalLink("https://x", "abcd2345", "  <> ")).toBe("https://x/i/abcd2345");
  });
});
