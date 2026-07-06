import { describe, expect, it } from "vitest";
import { tokensMatch } from "../token";

// Obviously-fake, low-entropy placeholders — never a real token.
const A = "organizer-token-example-a";
const B = "organizer-token-example-b";

describe("tokensMatch", () => {
  it("matches identical tokens", () => {
    expect(tokensMatch(A, A)).toBe(true);
  });

  it("rejects wrong, empty, and length-mismatched tokens", () => {
    expect(tokensMatch(A, B)).toBe(false);
    expect(tokensMatch("", A)).toBe(false);
    expect(tokensMatch(A, "")).toBe(false);
    expect(tokensMatch("abc", "abcd")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(tokensMatch("Abc", "abc")).toBe(false);
  });

  it("rejects non-string inputs (missing or duplicated query param)", () => {
    expect(tokensMatch(undefined, A)).toBe(false);
    expect(tokensMatch(["a", "b"], A)).toBe(false);
    expect(tokensMatch(null, A)).toBe(false);
  });
});
