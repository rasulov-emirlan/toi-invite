import { describe, expect, it } from "vitest";
import { CARD_DIMENSIONS, cardFilename, cardScale, isCardFormat } from "../card";

describe("card formats", () => {
  it("accepts only the two real formats", () => {
    expect(isCardFormat("story")).toBe(true);
    expect(isCardFormat("print")).toBe(true);
    for (const junk of ["a4", "", null, undefined, 1, "STORY"]) {
      expect(isCardFormat(junk)).toBe(false);
    }
  });

  it("story is 9:16 and print is A5 at 300dpi", () => {
    expect(CARD_DIMENSIONS.story).toEqual({ width: 1080, height: 1920 });
    expect(CARD_DIMENSIONS.story.width / CARD_DIMENSIONS.story.height).toBeCloseTo(9 / 16);
    // A5 = 148×210 mm; 300 dpi = 11.81 px/mm.
    expect(CARD_DIMENSIONS.print).toEqual({ width: 1748, height: 2480 });
    expect(CARD_DIMENSIONS.print.width / CARD_DIMENSIONS.print.height).toBeCloseTo(
      148 / 210,
      1,
    );
  });

  it("scales typography off the story width", () => {
    expect(cardScale("story")).toBe(1);
    expect(cardScale("print")).toBeCloseTo(1748 / 1080);
  });

  it("builds ASCII-safe download filenames", () => {
    expect(cardFilename("abcd2345", "story")).toBe("toi-abcd2345-story.jpg");
    expect(cardFilename("abcd2345", "print")).toBe("toi-abcd2345-a5.jpg");
  });
});
