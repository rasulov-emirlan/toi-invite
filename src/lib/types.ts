export type Locale = "ru" | "ky";

export type EventTypeKey =
  | "wedding"
  | "kyz_uzatuu"
  | "sunnet_toi"
  | "beshik_toi"
  | "jubilee";

export type TemplateKey = "gold" | "emerald" | "rose";

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
  dress_code?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  created_at: string;
}

export interface RsvpRecord {
  id: number;
  invite_slug: string;
  guest_name: string;
  attendance: Attendance;
  guests_count: number;
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
  dress_code?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}

export interface RsvpInput {
  guest_name: string;
  attendance: string;
  guests_count: number | string;
}
