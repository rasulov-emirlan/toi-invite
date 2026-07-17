import { describe, expect, it } from "vitest";
import { computeRsvpStats } from "../stats";
import type { RsvpRecord } from "../types";

function row(partial: Partial<RsvpRecord>): RsvpRecord {
  return {
    id: 1,
    invite_slug: "abcdef",
    guest_name: "Guest",
    attendance: "yes",
    guests_count: 1,
    wish: null,
    guest_ref: null,
    created_at: "2026-07-07 00:00:00",
    ...partial,
  };
}

describe("computeRsvpStats", () => {
  it("returns zeros for no rows", () => {
    expect(computeRsvpStats([])).toEqual({
      responses: 0,
      coming: 0,
      notComing: 0,
      totalGuests: 0,
    });
  });

  it("counts coming/not-coming and sums only the coming headcount", () => {
    const rows = [
      row({ id: 1, attendance: "yes", guests_count: 2 }),
      row({ id: 2, attendance: "yes", guests_count: 3 }),
      row({ id: 3, attendance: "no", guests_count: 1 }),
    ];
    expect(computeRsvpStats(rows)).toEqual({
      responses: 3,
      coming: 2,
      notComing: 1,
      totalGuests: 5, // 2 + 3, the "no" guest is not counted
    });
  });
});
