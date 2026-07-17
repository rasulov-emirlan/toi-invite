import { describe, expect, it } from "vitest";
import { countdownUnitLabel, ruPlural } from "../plural";

describe("ruPlural", () => {
  it("handles the one/few/many pattern", () => {
    expect(ruPlural(1, "день", "дня", "дней")).toBe("день");
    expect(ruPlural(2, "день", "дня", "дней")).toBe("дня");
    expect(ruPlural(4, "день", "дня", "дней")).toBe("дня");
    expect(ruPlural(5, "день", "дня", "дней")).toBe("дней");
    expect(ruPlural(0, "день", "дня", "дней")).toBe("дней");
  });

  it("treats 11–14 as many, unlike 21–24", () => {
    expect(ruPlural(11, "день", "дня", "дней")).toBe("дней");
    expect(ruPlural(12, "день", "дня", "дней")).toBe("дней");
    expect(ruPlural(14, "день", "дня", "дней")).toBe("дней");
    expect(ruPlural(21, "день", "дня", "дней")).toBe("день");
    expect(ruPlural(22, "день", "дня", "дней")).toBe("дня");
    expect(ruPlural(111, "день", "дня", "дней")).toBe("дней");
  });
});

describe("countdownUnitLabel", () => {
  it("inflects Russian units by count", () => {
    expect(countdownUnitLabel("ru", "day", 1)).toBe("день");
    expect(countdownUnitLabel("ru", "hour", 3)).toBe("часа");
    expect(countdownUnitLabel("ru", "minute", 5)).toBe("минут");
    expect(countdownUnitLabel("ru", "minute", 1)).toBe("минута");
  });

  it("keeps Kyrgyz units invariant", () => {
    expect(countdownUnitLabel("ky", "day", 1)).toBe("күн");
    expect(countdownUnitLabel("ky", "day", 5)).toBe("күн");
    expect(countdownUnitLabel("ky", "hour", 2)).toBe("саат");
    expect(countdownUnitLabel("ky", "minute", 21)).toBe("мүнөт");
  });
});
