import { describe, expect, it } from "vitest";
import {
  eventInstant,
  formatKgTimestamp,
  googleCalendarUrl,
  icsContent,
  toIcsUtc,
} from "../calendar";

describe("eventInstant / toIcsUtc", () => {
  it("converts KG local time (UTC+6) to the correct UTC stamp", () => {
    // 17:00 in Bishkek == 11:00 UTC
    const { start } = eventInstant("2026-09-12", "17:00");
    expect(toIcsUtc(start)).toBe("20260912T110000Z");
  });

  it("rolls the date back when local time is before the offset", () => {
    // 03:00 Bishkek == 21:00 UTC the previous day
    const { start } = eventInstant("2026-09-12", "03:00");
    expect(toIcsUtc(start)).toBe("20260911T210000Z");
  });

  it("applies the default 4h duration", () => {
    const { start, end } = eventInstant("2026-09-12", "17:00");
    expect(end.getTime() - start.getTime()).toBe(4 * 3600 * 1000);
  });
});

describe("googleCalendarUrl", () => {
  it("builds a render URL with encoded dates and fields", () => {
    const url = googleCalendarUrl({
      title: "Той: Азамат",
      details: "Кош келиңиздер",
      location: "Ала-Тоо",
      date: "2026-09-12",
      time: "17:00",
    });
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("dates=20260912T110000Z%2F20260912T150000Z");
    expect(url).toContain("action=TEMPLATE");
  });
});

describe("icsContent", () => {
  it("produces a valid VEVENT with escaped fields", () => {
    const ics = icsContent(
      {
        title: "Той; Азамат, Айпери",
        details: "line1\nline2",
        location: "Ала-Тоо",
        date: "2026-09-12",
        time: "17:00",
      },
      "abc-123",
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:abc-123");
    expect(ics).toContain("DTSTART:20260912T110000Z");
    expect(ics).toContain("DTEND:20260912T150000Z");
    // escaping: ; and , escaped, newline -> \n
    expect(ics).toContain("SUMMARY:Той\\; Азамат\\, Айпери");
    expect(ics).toContain("DESCRIPTION:line1\\nline2");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("normalises lone CR and CRLF newlines when escaping", () => {
    const ics = icsContent(
      { title: "x", details: "a\r\nb\rc", location: "l", date: "2026-09-12", time: "17:00" },
      "u",
    );
    expect(ics).toContain("DESCRIPTION:a\\nb\\nc");
    expect(ics).not.toContain("\r\n\r"); // no stray CR leaked into the body value
  });
});

describe("formatKgTimestamp", () => {
  it("shifts a SQLite UTC timestamp to KG local (+6)", () => {
    // 19:10 UTC -> 01:10 next day in Bishkek
    expect(formatKgTimestamp("2026-07-06 19:10:00")).toBe("2026-07-07 01:10");
    // 10:00 UTC -> 16:00 same day
    expect(formatKgTimestamp("2026-07-07 10:00:00")).toBe("2026-07-07 16:00");
  });

  it("returns the input unchanged if it is not a recognised timestamp", () => {
    expect(formatKgTimestamp("not-a-date")).toBe("not-a-date");
  });
});
