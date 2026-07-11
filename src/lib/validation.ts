import { isEventType } from "./events";
import { isTemplate } from "./templates";
import { isLocale } from "./i18n";
import type {
  Attendance,
  EventTypeKey,
  InviteInput,
  Locale,
  RsvpInput,
  TemplateKey,
} from "./types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export const LIMITS = {
  honoree: 80,
  partner: 80,
  venue: 160,
  greeting: 600,
  guestName: 80,
  mapUrl: 500,
  dressCode: 160,
  contactName: 80,
  contactPhone: 40,
  maxGuests: 50,
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isRealDate(iso: string): boolean {
  if (!DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Accept only http(s) links (2GIS share URLs). Blocks javascript:/data: etc. */
export function isSafeHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface CleanInvite {
  event_type: EventTypeKey;
  template: TemplateKey;
  locale: Locale;
  honoree: string;
  partner: string | null;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_map_url: string | null;
  greeting: string;
  dress_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
}

export function validateInvite(input: InviteInput): ValidationResult<CleanInvite> {
  const errors: string[] = [];

  if (!isEventType(input.event_type)) errors.push("event_type");
  if (!isTemplate(input.template)) errors.push("template");
  if (!isLocale(input.locale)) errors.push("locale");

  const honoree = str(input.honoree);
  if (honoree.length < 1 || honoree.length > LIMITS.honoree) errors.push("honoree");

  const partnerRaw = str(input.partner);
  if (partnerRaw.length > LIMITS.partner) errors.push("partner");
  const partner = partnerRaw.length > 0 ? partnerRaw : null;

  const event_date = str(input.event_date);
  if (!isRealDate(event_date)) errors.push("event_date");

  const event_time = str(input.event_time);
  if (!TIME_RE.test(event_time)) errors.push("event_time");

  const venue_name = str(input.venue_name);
  if (venue_name.length < 1 || venue_name.length > LIMITS.venue) errors.push("venue_name");

  const mapRaw = str(input.venue_map_url);
  let venue_map_url: string | null = null;
  if (mapRaw.length > 0) {
    if (mapRaw.length > LIMITS.mapUrl || !isSafeHttpUrl(mapRaw)) errors.push("venue_map_url");
    else venue_map_url = mapRaw;
  }

  const greeting = str(input.greeting);
  if (greeting.length > LIMITS.greeting) errors.push("greeting");

  const optional = (value: unknown, limit: number, field: string) => {
    const clean = str(value);
    if (clean.length > limit) errors.push(field);
    return clean || null;
  };
  const dress_code = optional(input.dress_code, LIMITS.dressCode, "dress_code");
  const contact_name = optional(input.contact_name, LIMITS.contactName, "contact_name");
  const contact_phone = optional(input.contact_phone, LIMITS.contactPhone, "contact_phone");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      event_type: input.event_type as EventTypeKey,
      template: input.template as TemplateKey,
      locale: input.locale as Locale,
      honoree,
      partner,
      event_date,
      event_time,
      venue_name,
      venue_map_url,
      greeting,
      dress_code,
      contact_name,
      contact_phone,
    },
  };
}

export interface CleanRsvp {
  guest_name: string;
  attendance: Attendance;
  guests_count: number;
}

function isAttendance(v: unknown): v is Attendance {
  return v === "yes" || v === "no";
}

export function validateRsvp(input: RsvpInput): ValidationResult<CleanRsvp> {
  const errors: string[] = [];

  const guest_name = str(input.guest_name);
  if (guest_name.length < 1 || guest_name.length > LIMITS.guestName) errors.push("guest_name");

  if (!isAttendance(input.attendance)) errors.push("attendance");

  const n =
    typeof input.guests_count === "number"
      ? input.guests_count
      : Number(String(input.guests_count).trim());
  if (!Number.isInteger(n) || n < 1 || n > LIMITS.maxGuests) errors.push("guests_count");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      guest_name,
      attendance: input.attendance as Attendance,
      guests_count: n,
    },
  };
}
