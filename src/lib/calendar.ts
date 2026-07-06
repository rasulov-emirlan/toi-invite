// Kyrgyzstan is UTC+6 year-round (no DST). We convert the organizer's local
// wall-clock time to UTC so calendar stamps are unambiguous everywhere.
const KG_UTC_OFFSET_HOURS = 6;
export const DEFAULT_DURATION_HOURS = 4;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as an iCalendar UTC stamp: YYYYMMDDTHHMMSSZ. */
export function toIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Convert a KG-local date+time into start/end Date objects (UTC-correct). */
export function eventInstant(
  date: string,
  time: string,
  durationHours: number = DEFAULT_DURATION_HOURS,
): { start: Date; end: Date } {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, hh - KG_UTC_OFFSET_HOURS, mm, 0));
  const end = new Date(start.getTime() + durationHours * 3600 * 1000);
  return { start, end };
}

export interface CalendarEvent {
  title: string;
  details: string;
  location: string;
  date: string; // YYYY-MM-DD (KG local)
  time: string; // HH:MM (KG local)
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const { start, end } = eventInstant(ev.date, ev.time);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details: ev.details,
    location: ev.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function icsContent(ev: CalendarEvent, uid: string): string {
  const { start, end } = eventInstant(ev.date, ev.time);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//toi-invite//RU//",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `DESCRIPTION:${icsEscape(ev.details)}`,
    `LOCATION:${icsEscape(ev.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
