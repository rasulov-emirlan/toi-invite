import { describe, expect, it } from "vitest";
import { GIFT_LIMITS, cleanGiftTitle, toGuestGifts } from "../gifts";
import type { GiftRecord } from "../types";

function gift(p: Partial<GiftRecord>): GiftRecord {
  return {
    id: 1,
    invite_slug: "abcd2345",
    title: "Самовар",
    claimed_ref: null,
    claimed_name: null,
    created_at: "2026-07-17 07:00:00",
    claimed_at: null,
    ...p,
  };
}

describe("cleanGiftTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanGiftTitle("  Чайный   сервиз ")).toBe("Чайный сервиз");
  });

  it("rejects empty, non-string and over-limit titles", () => {
    expect(cleanGiftTitle("   ")).toBe(null);
    expect(cleanGiftTitle(undefined)).toBe(null);
    expect(cleanGiftTitle(42)).toBe(null);
    expect(cleanGiftTitle("x".repeat(GIFT_LIMITS.title + 1))).toBe(null);
    expect(cleanGiftTitle("x".repeat(GIFT_LIMITS.title))).toHaveLength(GIFT_LIMITS.title);
  });
});

describe("toGuestGifts", () => {
  const rows = [
    gift({ id: 1, claimed_ref: null }),
    gift({ id: 2, claimed_ref: "ref-aaaa-1111", claimed_name: "Айбек" }),
    gift({ id: 3, claimed_ref: "ref-bbbb-2222", claimed_name: "Нургүл" }),
  ];

  it("marks taken and the caller's own reservation", () => {
    const view = toGuestGifts(rows, "ref-aaaa-1111");
    expect(view.map((g) => g.taken)).toEqual([false, true, true]);
    expect(view.map((g) => g.yours)).toEqual([false, true, false]);
  });

  it("never leaks the claimer's name or ref", () => {
    for (const g of toGuestGifts(rows, "ref-aaaa-1111")) {
      expect(Object.keys(g).sort()).toEqual(["id", "taken", "title", "yours"]);
    }
  });

  it("treats a null ref as owning nothing", () => {
    expect(toGuestGifts(rows, null).every((g) => !g.yours)).toBe(true);
  });
});
