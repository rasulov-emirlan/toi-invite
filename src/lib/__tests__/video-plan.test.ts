import { describe, expect, it } from "vitest";
import {
  FADE_SEC,
  SCENE_SEC,
  buildFilterGraph,
  planScenes,
  totalDurationSec,
  videoCacheKey,
  videoDownloadName,
  videoFilename,
} from "../video-plan";

describe("planScenes", () => {
  it("adds the photo scene only when the invite has a photo", () => {
    expect(planScenes(false)).toEqual([
      "opening", "names", "date", "venue", "greeting", "cta",
    ]);
    expect(planScenes(true)).toEqual([
      "opening", "names", "photo", "date", "venue", "greeting", "cta",
    ]);
  });
});

describe("totalDurationSec", () => {
  it("subtracts the crossfade overlap between consecutive scenes", () => {
    expect(totalDurationSec(1)).toBe(SCENE_SEC);
    expect(totalDurationSec(7)).toBeCloseTo(7 * SCENE_SEC - 6 * FADE_SEC);
    // The WhatsApp deliverable stays around half a minute.
    expect(totalDurationSec(7)).toBeLessThanOrEqual(31);
  });
});

describe("buildFilterGraph", () => {
  it("chains one zoompan per scene and n-1 crossfades into [vout]/[aout]", () => {
    const g = buildFilterGraph(6);
    expect(g.match(/zoompan/g)).toHaveLength(6);
    expect(g.match(/xfade/g)).toHaveLength(5);
    expect(g).toContain("[vout]");
    expect(g).toContain("[aout]");
    // Music is the input after the six scene stills.
    expect(g).toContain("[6:a]");
  });

  it("accumulates xfade offsets on the combined timeline", () => {
    const g = buildFilterGraph(3);
    const offsets = [...g.matchAll(/offset=([\d.]+)/g)].map((m) => Number(m[1]));
    expect(offsets).toEqual([
      SCENE_SEC - FADE_SEC,
      2 * (SCENE_SEC - FADE_SEC),
    ]);
  });

  it("fades the music out at the end of the combined duration", () => {
    const g = buildFilterGraph(6);
    const total = totalDurationSec(6);
    expect(g).toContain(`atrim=0:${total.toFixed(2)}`);
    expect(g).toContain(`afade=t=out:st=${(total - 2.2).toFixed(2)}`);
  });
});

describe("videoCacheKey", () => {
  it("is stable for identical inputs and sensitive to any drawn field", () => {
    const base = ["slug", "ru", "gold", "Азамат", null];
    expect(videoCacheKey(base)).toBe(videoCacheKey([...base]));
    expect(videoCacheKey(base)).not.toBe(videoCacheKey(["slug", "ru", "gold", "Азамат", "x"]));
    expect(videoCacheKey(base)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("does not confuse a null field with an empty-adjacent concatenation", () => {
    expect(videoCacheKey(["ab", null])).not.toBe(videoCacheKey(["a", "b"]));
  });
});

describe("filenames", () => {
  it("stays ASCII-safe for Content-Disposition", () => {
    expect(videoFilename("myslug", "abc123")).toBe("myslug-abc123.mp4");
    expect(videoDownloadName("myslug")).toBe("toi-myslug-video.mp4");
  });
});
