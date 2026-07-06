import "server-only";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  Attendance,
  EventTypeKey,
  InviteRecord,
  Locale,
  RsvpRecord,
  TemplateKey,
} from "./types";
import type { CleanInvite } from "./validation";
import { generateSlug, generateToken } from "./slug";

const DB_PATH = resolve(process.env.DB_PATH ?? "./data/toi.db");

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const handle = new Database(DB_PATH);
  handle.pragma("journal_mode = WAL");
  handle.pragma("foreign_keys = ON");
  handle.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      slug            TEXT PRIMARY KEY,
      organizer_token TEXT NOT NULL,
      event_type      TEXT NOT NULL,
      template        TEXT NOT NULL,
      locale          TEXT NOT NULL,
      honoree         TEXT NOT NULL,
      partner         TEXT,
      event_date      TEXT NOT NULL,
      event_time      TEXT NOT NULL,
      venue_name      TEXT NOT NULL,
      venue_map_url   TEXT,
      greeting        TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rsvps (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      invite_slug  TEXT NOT NULL REFERENCES invites(slug) ON DELETE CASCADE,
      guest_name   TEXT NOT NULL,
      attendance   TEXT NOT NULL,
      guests_count INTEGER NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rsvps_slug ON rsvps(invite_slug);
  `);
  _db = handle;
  return _db;
}

export function createInvite(clean: CleanInvite): { slug: string; token: string } {
  const conn = db();
  const token = generateToken();
  const insert = conn.prepare(`
    INSERT INTO invites
      (slug, organizer_token, event_type, template, locale, honoree, partner,
       event_date, event_time, venue_name, venue_map_url, greeting)
    VALUES
      (@slug, @organizer_token, @event_type, @template, @locale, @honoree, @partner,
       @event_date, @event_time, @venue_name, @venue_map_url, @greeting)
  `);

  // Retry on the (astronomically unlikely) slug collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    try {
      insert.run({
        slug,
        organizer_token: token,
        event_type: clean.event_type,
        template: clean.template,
        locale: clean.locale,
        honoree: clean.honoree,
        partner: clean.partner,
        event_date: clean.event_date,
        event_time: clean.event_time,
        venue_name: clean.venue_name,
        venue_map_url: clean.venue_map_url,
        greeting: clean.greeting,
      });
      return { slug, token };
    } catch (err) {
      const msg = String((err as Error).message);
      if (msg.includes("UNIQUE") && attempt < 4) continue;
      throw err;
    }
  }
  throw new Error("could not allocate a unique slug");
}

export function getInvite(slug: string): InviteRecord | null {
  const row = db().prepare("SELECT * FROM invites WHERE slug = ?").get(slug) as
    | (Omit<InviteRecord, "event_type" | "template" | "locale"> & {
        event_type: string;
        template: string;
        locale: string;
      })
    | undefined;
  if (!row) return null;
  return {
    ...row,
    event_type: row.event_type as EventTypeKey,
    template: row.template as TemplateKey,
    locale: row.locale as Locale,
  };
}

export function addRsvp(
  slug: string,
  data: { guest_name: string; attendance: Attendance; guests_count: number },
): boolean {
  const conn = db();
  const exists = conn.prepare("SELECT 1 FROM invites WHERE slug = ?").get(slug);
  if (!exists) return false;
  conn
    .prepare(
      `INSERT INTO rsvps (invite_slug, guest_name, attendance, guests_count)
       VALUES (?, ?, ?, ?)`,
    )
    .run(slug, data.guest_name, data.attendance, data.guests_count);
  return true;
}

export function listRsvps(slug: string): RsvpRecord[] {
  return db()
    .prepare(
      "SELECT * FROM rsvps WHERE invite_slug = ? ORDER BY created_at DESC, id DESC",
    )
    .all(slug) as RsvpRecord[];
}
