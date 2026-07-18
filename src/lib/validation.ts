import { isEventType } from "./events";
import { isTemplate } from "./templates";
import { isLocale } from "./i18n";
import { normalizeKgPhone } from "./premium";
import type {
  Attendance,
  EventTypeKey,
  InviteInput,
  Locale,
  ProgramItem,
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
  maxGuests: 50,
  wish: 300,
  landmark: 160,
  dressCode: 120,
  programItems: 12,
  programTitle: 80,
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

/**
 * People paste map links straight from the 2GIS/Google share sheet, which
 * sometimes omits the protocol ("go.2gis.com/abcd"). Prepend https:// when the
 * value has no scheme but otherwise looks like a host/path — anything still
 * unparseable stays as typed and fails validation downstream.
 */
export function normalizeMapUrl(raw: string): string {
  const v = raw.trim();
  if (v.length === 0) return v;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return v; // has a scheme already
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return v;
}

/**
 * Parse + validate the toi programme. Accepts an array of {time, title};
 * returns the canonical JSON string, null when empty/absent, or undefined when
 * malformed (the error case — distinct from "not provided").
 */
export function cleanProgram(input: unknown): string | null | undefined {
  if (input == null) return null;
  if (!Array.isArray(input)) return undefined;
  const items: ProgramItem[] = [];
  for (const it of input) {
    if (it == null || typeof it !== "object" || Array.isArray(it)) return undefined;
    const time = str((it as Record<string, unknown>).time);
    const title = str((it as Record<string, unknown>).title);
    if (title.length === 0 && time.length === 0) continue; // skip blank rows
    if (title.length < 1 || title.length > LIMITS.programTitle) return undefined;
    if (time.length > 0 && !TIME_RE.test(time)) return undefined;
    items.push({ time, title });
  }
  if (items.length === 0) return null;
  if (items.length > LIMITS.programItems) return undefined;
  return JSON.stringify(items);
}

/** Parse a stored program_json back into items. Lenient: bad data → empty. */
export function programFromJson(json: string | null): ProgramItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is ProgramItem =>
        it != null &&
        typeof it === "object" &&
        typeof it.time === "string" &&
        typeof it.title === "string",
    );
  } catch {
    return [];
  }
}

/** Ids minted by the photo-upload endpoint (slug alphabet, fixed length). */
const PHOTO_ID_RE = /^[a-z0-9]{12,32}$/;

export function isValidPhotoId(v: unknown): v is string {
  return typeof v === "string" && PHOTO_ID_RE.test(v);
}

/** Attribution ref carried by the viral-loop link (?ref=<slug or tag>). */
const CREATED_REF_RE = /^[A-Za-z0-9_-]{1,32}$/;

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
  greeting_ru: string | null;
  greeting_ky: string | null;
  host_phone: string | null;
  landmark: string | null;
  rsvp_deadline: string | null;
  dress_code: string | null;
  program_json: string | null;
  photo_id: string | null;
  created_ref: string | null;
}

/** Guard for JSON bodies that parse fine but aren't usable objects (null, arrays, primitives). */
function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export function validateInvite(input: InviteInput): ValidationResult<CleanInvite> {
  if (!isRecord(input)) return { ok: false, errors: ["body"] };

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

  const mapRaw = normalizeMapUrl(str(input.venue_map_url));
  let venue_map_url: string | null = null;
  if (mapRaw.length > 0) {
    if (mapRaw.length > LIMITS.mapUrl || !isSafeHttpUrl(mapRaw)) errors.push("venue_map_url");
    else venue_map_url = mapRaw;
  }

  const greeting = str(input.greeting);
  if (greeting.length > LIMITS.greeting) errors.push("greeting");

  const greetingRuRaw = str(input.greeting_ru);
  if (greetingRuRaw.length > LIMITS.greeting) errors.push("greeting_ru");
  const greeting_ru = greetingRuRaw.length > 0 ? greetingRuRaw : null;

  const greetingKyRaw = str(input.greeting_ky);
  if (greetingKyRaw.length > LIMITS.greeting) errors.push("greeting_ky");
  const greeting_ky = greetingKyRaw.length > 0 ? greetingKyRaw : null;

  const phoneRaw = str(input.host_phone);
  let host_phone: string | null = null;
  if (phoneRaw.length > 0) {
    host_phone = normalizeKgPhone(phoneRaw);
    if (!host_phone) errors.push("host_phone");
  }

  const landmarkRaw = str(input.landmark);
  if (landmarkRaw.length > LIMITS.landmark) errors.push("landmark");
  const landmark = landmarkRaw.length > 0 ? landmarkRaw : null;

  const deadlineRaw = str(input.rsvp_deadline);
  let rsvp_deadline: string | null = null;
  if (deadlineRaw.length > 0) {
    if (!isRealDate(deadlineRaw)) errors.push("rsvp_deadline");
    else rsvp_deadline = deadlineRaw;
  }

  const dressRaw = str(input.dress_code);
  if (dressRaw.length > LIMITS.dressCode) errors.push("dress_code");
  const dress_code = dressRaw.length > 0 ? dressRaw : null;

  const program_json = cleanProgram(input.program);
  if (program_json === undefined) errors.push("program");

  const photoRaw = str(input.photo_id);
  let photo_id: string | null = null;
  if (photoRaw.length > 0) {
    if (!isValidPhotoId(photoRaw)) errors.push("photo_id");
    else photo_id = photoRaw;
  }

  // Attribution is best-effort: a malformed ref degrades to "no ref" rather
  // than blocking the creation it is only meant to measure.
  const refRaw = str(input.created_ref);
  const created_ref = CREATED_REF_RE.test(refRaw) ? refRaw : null;

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
      greeting_ru,
      greeting_ky,
      host_phone,
      landmark,
      rsvp_deadline,
      dress_code,
      program_json: program_json ?? null,
      photo_id,
      created_ref,
    },
  };
}

export interface CleanRsvp {
  guest_name: string;
  attendance: Attendance;
  guests_count: number;
  wish: string | null;
  guest_ref: string | null;
  invited_guest_id: number | null;
}

/**
 * Opaque per-browser id used only to fold a guest's repeat submissions into one
 * row. Lenient: a malformed value degrades to "no id" (plain insert) rather
 * than rejecting the RSVP.
 */
const GUEST_REF_RE = /^[A-Za-z0-9_-]{8,64}$/;

function isAttendance(v: unknown): v is Attendance {
  return v === "yes" || v === "no";
}

export function validateRsvp(input: RsvpInput): ValidationResult<CleanRsvp> {
  if (!isRecord(input)) return { ok: false, errors: ["body"] };

  const errors: string[] = [];

  const guest_name = str(input.guest_name);
  if (guest_name.length < 1 || guest_name.length > LIMITS.guestName) errors.push("guest_name");

  if (!isAttendance(input.attendance)) errors.push("attendance");

  const n =
    typeof input.guests_count === "number"
      ? input.guests_count
      : Number(String(input.guests_count).trim());
  if (!Number.isInteger(n) || n < 1 || n > LIMITS.maxGuests) errors.push("guests_count");

  const wishRaw = str(input.wish);
  if (wishRaw.length > LIMITS.wish) errors.push("wish");
  const wish = wishRaw.length > 0 ? wishRaw : null;

  const refRaw = str(input.guest_ref);
  const guest_ref = GUEST_REF_RE.test(refRaw) ? refRaw : null;

  // Same lenient stance as guest_ref: this only links the RSVP to the
  // organizer's guest list; junk degrades to "not linked".
  const gidRaw = input.invited_guest_id;
  const gid =
    typeof gidRaw === "number" ? gidRaw : Number(String(gidRaw ?? "").trim());
  const invited_guest_id =
    Number.isInteger(gid) && gid > 0 && gid <= Number.MAX_SAFE_INTEGER ? gid : null;

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      guest_name,
      attendance: input.attendance as Attendance,
      guests_count: n,
      wish,
      guest_ref,
      invited_guest_id,
    },
  };
}
