export type Locale = "ru" | "ky";

export type EventTypeKey =
  | "wedding"
  | "kyz_uzatuu"
  | "sunnet_toi"
  | "beshik_toi"
  | "jubilee";

export type TemplateKey =
  | "gold"
  | "emerald"
  | "rose"
  | "ornament_gold"
  | "ornament_emerald"
  | "ornament_rose";

export type PremiumTierKey = "free" | "premium" | "pro" | "concierge";

export type Attendance = "yes" | "no";

/** One line of the toi programme: "17:00 — Встреча гостей". */
export interface ProgramItem {
  time: string; // HH:MM (24h)
  title: string;
}

export interface InviteRecord {
  slug: string;
  organizer_token: string;
  event_type: EventTypeKey;
  template: TemplateKey;
  locale: Locale;
  honoree: string;
  partner: string | null;
  event_date: string; // ISO date, YYYY-MM-DD
  event_time: string; // HH:MM (24h)
  venue_name: string;
  venue_map_url: string | null;
  /** Legacy single greeting — the invite's primary-locale text. */
  greeting: string;
  /** Per-language greetings; fall back to `greeting` when absent. */
  greeting_ru: string | null;
  greeting_ky: string | null;
  host_phone: string | null; // normalized +996XXXXXXXXX
  landmark: string | null;
  rsvp_deadline: string | null; // ISO date
  dress_code: string | null;
  program_json: string | null; // JSON-serialized ProgramItem[]
  photo_id: string | null;
  organizer_ref: string | null;
  created_ref: string | null;
  /** Paid tier key once a Finik payment for this invite settles. */
  premium_tier: string | null;
  created_at: string;
}

/** What the invite card needs to render — no organizer secrets. */
export type InviteDisplay = Omit<
  InviteRecord,
  "organizer_token" | "organizer_ref" | "created_ref" | "created_at"
>;

export interface RsvpRecord {
  id: number;
  invite_slug: string;
  guest_name: string;
  attendance: Attendance;
  guests_count: number;
  wish: string | null;
  guest_ref: string | null;
  invited_guest_id: number | null;
  created_at: string;
}

export interface GiftRecord {
  id: number;
  invite_slug: string;
  title: string;
  claimed_ref: string | null;
  claimed_name: string | null;
  created_at: string;
  claimed_at: string | null;
}

/** What a guest may see: taken yes/no and whether it's their own reservation —
 *  never who claimed (that's the organizer's view) and never the claim ref. */
export interface GuestGift {
  id: number;
  title: string;
  taken: boolean;
  yours: boolean;
}

/** A guest the organizer explicitly invited (via the personal-link generator). */
export interface InvitedGuestRecord {
  id: number;
  invite_slug: string;
  /** Personal-link capability (?g=<token>) — unguessable, unlike the row id. */
  token: string;
  name: string;
  created_at: string;
  opened_at: string | null;
}

/** Guest-list board status, derived from invited_guests × rsvps. */
export type GuestStatus = "coming" | "declined" | "opened" | "invited";

/** Shape accepted by the create endpoint (before validation). */
export interface InviteInput {
  event_type: string;
  template: string;
  locale: string;
  honoree: string;
  partner?: string | null;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_map_url?: string | null;
  greeting?: string;
  greeting_ru?: string | null;
  greeting_ky?: string | null;
  host_phone?: string | null;
  landmark?: string | null;
  rsvp_deadline?: string | null;
  dress_code?: string | null;
  program?: unknown;
  photo_id?: string | null;
  created_ref?: string | null;
}

export interface RsvpInput {
  guest_name: string;
  attendance: string;
  guests_count: number | string;
  wish?: string | null;
  guest_ref?: string | null;
  invited_guest?: string | null;
}

/** Shape accepted by the premium-interest endpoint (before validation). */
export interface PremiumInterestInput {
  tier: string;
  name: string;
  phone: string;
  locale: string;
  comment?: string | null;
}

export interface PremiumInterestRecord {
  id: number;
  tier: PremiumTierKey;
  name: string;
  phone: string; // normalized +996XXXXXXXXX
  locale: Locale;
  comment: string | null;
  created_at: string;
}
