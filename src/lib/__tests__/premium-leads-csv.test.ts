import { describe, expect, it } from "vitest";
import { premiumLeadsToCsv } from "../csv";
import type { PremiumInterestRecord } from "../types";

function row(p: Partial<PremiumInterestRecord>): PremiumInterestRecord {
  return {
    id: 1,
    tier: "premium",
    name: "Айжан",
    phone: "+996 555 123 456",
    locale: "ru",
    comment: "Позвоните вечером",
    created_at: "2026-07-07 05:00:00",
    ...p,
  };
}

describe("premiumLeadsToCsv", () => {
  it("starts with a BOM and includes the header row", () => {
    const csv = premiumLeadsToCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split("\r\n")[0]).toBe(
      "created_at,tier,name,phone,locale,comment",
    );
  });

  it("guards formula-injection values in name and comment", () => {
    const csv = premiumLeadsToCsv([
      row({ name: "=1+1", comment: "+ опасно" }),
      row({ id: 2, name: "-5", comment: "@SUM(A1)" }),
    ]);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[1]).toContain("'=1+1");
    expect(lines[1]).toContain("'+ опасно");
    expect(lines[2]).toContain("'-5");
    expect(lines[2]).toContain("'@SUM(A1)");
  });

  it("escapes commas and quotes", () => {
    const csv = premiumLeadsToCsv([row({ name: 'Иван, "Босс"' })]);
    expect(csv.slice(1).split("\r\n")[1]).toContain('"Иван, ""Босс"""');
  });

  it("renders an empty data set with a trailing CRLF", () => {
    expect(premiumLeadsToCsv([])).toBe(
      "\ufeffcreated_at,tier,name,phone,locale,comment\r\n",
    );
  });
});
