export type Locale = "ru" | "ky";

export type EventTypeKey =
  | "wedding"
  | "kyz_uzatuu"
  | "sunnet_toi"
  | "beshik_toi"
  | "jubilee";

export type TemplateKey = "gold" | "emerald" | "rose";

export type PremiumTierKey = "free" | "premium" | "pro";

export type Attendance = "yes" | "no";

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
  greeting: string;
  created_at: string;
}

/** What the invite card needs to render — no organizer secrets. */
export type InviteDisplay = Omit<InviteRecord, "organizer_token" | "created_at">;

export interface RsvpRecord {
  id: number;
  invite_slug: string;
  guest_name: string;
  attendance: Attendance;
  guests_count: number;
  wish: string | null;
  guest_ref: string | null;
  created_at: string;
}

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
}

export interface RsvpInput {
  guest_name: string;
  attendance: string;
  guests_count: number | string;
  wish?: string | null;
  guest_ref?: string | null;
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
