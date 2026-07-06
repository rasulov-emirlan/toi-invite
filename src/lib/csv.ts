import { translator } from "./i18n";
import { formatKgTimestamp } from "./calendar";
import type { Locale, RsvpRecord } from "./types";

/** RFC-4180 field escaping: quote when the value contains " , CR or LF. */
function esc(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

/**
 * Render the RSVP list as CSV for the organizer to hand to the venue / тамада.
 * Prefixed with a UTF-8 BOM so Excel opens the Cyrillic correctly; CRLF line
 * endings per RFC-4180.
 */
export function rsvpsToCsv(rows: RsvpRecord[], locale: Locale): string {
  const tr = translator(locale);
  const header = [
    tr("rsvps.col_name"),
    tr("rsvps.col_status"),
    tr("rsvps.col_guests"),
    tr("rsvps.col_when"),
  ];
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    const status = r.attendance === "yes" ? tr("rsvps.status_yes") : tr("rsvps.status_no");
    const guests = r.attendance === "yes" ? String(r.guests_count) : "";
    lines.push(
      [esc(r.guest_name), esc(status), esc(guests), esc(formatKgTimestamp(r.created_at))].join(","),
    );
  }
  const BOM = String.fromCharCode(0xfeff);
  return BOM + lines.join("\r\n") + "\r\n";
}
