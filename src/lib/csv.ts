import { translator } from "./i18n";
import { formatKgTimestamp } from "./calendar";
import type { Locale, RsvpRecord } from "./types";

/**
 * Field escaping. Two layers:
 *  - Formula-injection guard: a cell whose first char is = + - @ TAB or CR is
 *    prefixed with a single quote, so Excel/Sheets treat it as text instead of a
 *    formula (guest names are attacker-controlled via the public RSVP form).
 *  - RFC-4180 structural quoting: wrap in quotes (doubling internal quotes) when
 *    the value contains " , CR or LF.
 */
function esc(field: string): string {
  const c0 = field.charCodeAt(0); // NaN for empty string
  const isFormula =
    field[0] === "=" ||
    field[0] === "+" ||
    field[0] === "-" ||
    field[0] === "@" ||
    c0 === 0x09 || // TAB
    c0 === 0x0d; // CR
  const guarded = isFormula ? "'" + field : field;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
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
    tr("rsvps.col_wish"),
    tr("rsvps.col_when"),
  ];
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    const status = r.attendance === "yes" ? tr("rsvps.status_yes") : tr("rsvps.status_no");
    const guests = r.attendance === "yes" ? String(r.guests_count) : "";
    lines.push(
      [
        esc(r.guest_name),
        esc(status),
        esc(guests),
        esc(r.wish ?? ""),
        esc(formatKgTimestamp(r.created_at)),
      ].join(","),
    );
  }
  const BOM = String.fromCharCode(0xfeff);
  return BOM + lines.join("\r\n") + "\r\n";
}
