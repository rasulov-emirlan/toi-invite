import { describe, expect, it } from "vitest";
import { rsvpsToCsv } from "../csv";
import type { RsvpRecord } from "../types";

function row(p: Partial<RsvpRecord>): RsvpRecord {
  return {
    id: 1,
    invite_slug: "abcd2345",
    guest_name: "Гость",
    attendance: "yes",
    guests_count: 1,
    wish: null,
    guest_ref: null,
    invited_guest_id: null,
    created_at: "2026-07-07 05:00:00",
    ...p,
  };
}

describe("rsvpsToCsv", () => {
  it("starts with a UTF-8 BOM and a localized header row", () => {
    const csv = rsvpsToCsv([], "ru");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const firstLine = csv.slice(1).split("\r\n")[0];
    expect(firstLine).toBe("Имя,Ответ,Гостей,Пожелание,Когда ответил");
  });

  it("localizes the header in Kyrgyz", () => {
    const csv = rsvpsToCsv([], "ky");
    expect(csv.slice(1).split("\r\n")[0]).toBe("Ысым,Жооп,Мейман,Каалоо-тилек,Качан жооп берди");
  });

  it("renders yes/no rows with localized status and KG-local time", () => {
    const csv = rsvpsToCsv(
      [
        row({ id: 1, guest_name: "Нургүл", attendance: "yes", guests_count: 3 }),
        row({ id: 2, guest_name: "Бакыт", attendance: "no", guests_count: 1 }),
      ],
      "ru",
    );
    const lines = csv.slice(1).trimEnd().split("\r\n");
    // 05:00 UTC -> 11:00 Bishkek
    expect(lines[1]).toBe("Нургүл,Придёт,3,,2026-07-07 11:00");
    // "no" row: no guest count, status "Не придёт"
    expect(lines[2]).toBe("Бакыт,Не придёт,,,2026-07-07 11:00");
  });

  it("escapes commas, quotes and newlines per RFC-4180", () => {
    const csv = rsvpsToCsv(
      [row({ guest_name: 'Иван, "Босс"\nСмит' })],
      "ru",
    );
    const dataLine = csv.slice(1).split("\r\n")[1];
    expect(dataLine.startsWith('"Иван, ""Босс""\nСмит"')).toBe(true);
  });

  it("includes the guest wish column, escaped", () => {
    const csv = rsvpsToCsv(
      [row({ guest_name: "Нургүл", wish: "Бактылуу болгула, эки жаш!" })],
      "ky",
    );
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[1]).toBe("Нургүл,Келет,1,\"Бактылуу болгула, эки жаш!\",2026-07-07 11:00");
  });

  it("uses CRLF line endings", () => {
    const csv = rsvpsToCsv([row({})], "ru");
    expect(csv).toContain("\r\n");
  });

  it("neutralizes CSV formula injection in a guest name", () => {
    const csv = rsvpsToCsv(
      [
        row({ id: 1, guest_name: "=1+1" }),
        row({ id: 2, guest_name: "@SUM(A1)" }),
        row({ id: 3, guest_name: "-5" }),
        row({ id: 4, guest_name: '=HYPERLINK("http://evil","x")' }),
      ],
      "ru",
    );
    const lines = csv.slice(1).split("\r\n");
    expect(lines[1].startsWith("'=1+1,")).toBe(true);
    expect(lines[2].startsWith("'@SUM(A1),")).toBe(true);
    expect(lines[3].startsWith("'-5,")).toBe(true);
    // the =HYPERLINK cell has a comma, so it's guarded AND RFC-quoted
    expect(lines[4].startsWith('"\'=HYPERLINK(')).toBe(true);
  });
});
