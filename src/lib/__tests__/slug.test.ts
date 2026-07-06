import { describe, expect, it } from "vitest";
import {
  encodeFromBytes,
  generateSlug,
  generateToken,
  isValidSlug,
  SLUG_LENGTH,
  TOKEN_LENGTH,
} from "../slug";

describe("encodeFromBytes", () => {
  it("is deterministic for fixed bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 3]);
    const a = encodeFromBytes(bytes, "abcd");
    const b = encodeFromBytes(bytes, "abcd");
    expect(a).toBe(b);
    // 0%4=a, 1%4=b, 2%4=c, 3%4=d
    expect(a).toBe("abcd");
  });

  it("maps every byte onto the alphabet", () => {
    const bytes = new Uint8Array([4, 5]); // 4%4=a, 5%4=b
    expect(encodeFromBytes(bytes, "abcd")).toBe("ab");
  });
});

describe("generateSlug", () => {
  it("has the expected length and only uses the safe alphabet", () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(SLUG_LENGTH);
    expect(slug).toMatch(/^[23456789abcdefghijkmnpqrstuvwxyz]+$/);
  });

  it("never contains ambiguous characters (0 O 1 l I)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateSlug()).not.toMatch(/[0O1lI]/);
    }
  });

  it("is practically unique across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(generateSlug());
    expect(seen.size).toBe(5000);
  });
});

describe("generateToken", () => {
  it("has the expected length", () => {
    expect(generateToken()).toHaveLength(TOKEN_LENGTH);
  });

  it("is unique across draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generateToken());
    expect(seen.size).toBe(2000);
  });
});

describe("isValidSlug", () => {
  it("accepts generated slugs", () => {
    expect(isValidSlug(generateSlug())).toBe(true);
  });

  it("rejects empties, wrong charset, path tricks", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("ab")).toBe(false); // too short
    expect(isValidSlug("UPPER")).toBe(false);
    expect(isValidSlug("has space")).toBe(false);
    expect(isValidSlug("../etc")).toBe(false);
    expect(isValidSlug("abc0O1")).toBe(false); // ambiguous chars excluded
    expect(isValidSlug(123 as unknown)).toBe(false);
  });
});
