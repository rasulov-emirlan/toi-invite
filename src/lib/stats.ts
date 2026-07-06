import type { RsvpRecord } from "./types";

export interface RsvpStats {
  responses: number;
  coming: number;
  notComing: number;
  /** Total headcount across everyone who answered "yes". */
  totalGuests: number;
}

/** Pure aggregation over RSVP rows — used by the organizer view and its test. */
export function computeRsvpStats(rows: RsvpRecord[]): RsvpStats {
  let coming = 0;
  let notComing = 0;
  let totalGuests = 0;
  for (const r of rows) {
    if (r.attendance === "yes") {
      coming += 1;
      totalGuests += r.guests_count;
    } else {
      notComing += 1;
    }
  }
  return { responses: rows.length, coming, notComing, totalGuests };
}
