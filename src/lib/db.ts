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
import type { CleanPremiumInterest } from "./premium";
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
    CREATE TABLE IF NOT EXISTS premium_interest (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tier       TEXT NOT NULL,
      name       TEXT NOT NULL,
      phone      TEXT NOT NULL,
      locale     TEXT NOT NULL,
      comment    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  migrateRsvps(handle);
  _db = handle;
  return _db;
}

/**
 * Additive rsvps migrations for databases created before these columns existed:
 *  - wish: optional congratulation text from the guest.
 *  - guest_ref: opaque per-browser id, so the same guest re-submitting updates
 *    their row instead of double-counting — without letting anyone overwrite a
 *    stranger's answer by typing the same name. Legacy rows keep NULL (each was
 *    a distinct submission; the unique index ignores NULLs).
 */
function migrateRsvps(handle: Database.Database) {
  const cols = new Set(
    (handle.pragma("table_info(rsvps)") as Array<{ name: string }>).map((c) => c.name),
  );
  if (!cols.has("wish")) {
    handle.exec("ALTER TABLE rsvps ADD COLUMN wish TEXT");
  }
  if (!cols.has("guest_ref")) {
    handle.exec("ALTER TABLE rsvps ADD COLUMN guest_ref TEXT");
  }
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_slug_ref
     ON rsvps(invite_slug, guest_ref) WHERE guest_ref IS NOT NULL`,
  );
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

/** Full-replace update of an invite's editable fields. */
export function updateInvite(slug: string, clean: CleanInvite): boolean {
  const info = db()
    .prepare(
      `UPDATE invites
       SET event_type = @event_type, template = @template, locale = @locale,
           honoree = @honoree, partner = @partner, event_date = @event_date,
           event_time = @event_time, venue_name = @venue_name,
           venue_map_url = @venue_map_url, greeting = @greeting
       WHERE slug = @slug`,
    )
    .run({ slug, ...clean });
  return info.changes > 0;
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
  data: {
    guest_name: string;
    attendance: Attendance;
    guests_count: number;
    wish: string | null;
    guest_ref: string | null;
  },
): boolean {
  const conn = db();
  const upsert = conn.transaction((): boolean => {
    const exists = conn.prepare("SELECT 1 FROM invites WHERE slug = ?").get(slug);
    if (!exists) return false;
    // The same browser answering again (typo fix, changed mind) updates its own
    // row — otherwise every re-submit inflates the organizer's headcount. The
    // key is an opaque client id, NOT the typed name: a name is display data
    // and must never authorize overwriting someone else's answer.
    const prior = data.guest_ref
      ? (conn
          .prepare("SELECT id FROM rsvps WHERE invite_slug = ? AND guest_ref = ?")
          .get(slug, data.guest_ref) as { id: number } | undefined)
      : undefined;
    if (prior) {
      conn
        .prepare(
          `UPDATE rsvps
           SET guest_name = ?, attendance = ?, guests_count = ?, wish = ?,
               created_at = datetime('now')
           WHERE id = ?`,
        )
        .run(data.guest_name, data.attendance, data.guests_count, data.wish, prior.id);
    } else {
      conn
        .prepare(
          `INSERT INTO rsvps (invite_slug, guest_name, guest_ref, attendance, guests_count, wish)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(slug, data.guest_name, data.guest_ref, data.attendance, data.guests_count, data.wish);
    }
    return true;
  });
  return upsert();
}

export function listRsvps(slug: string): RsvpRecord[] {
  return db()
    .prepare(
      "SELECT * FROM rsvps WHERE invite_slug = ? ORDER BY created_at DESC, id DESC",
    )
    .all(slug) as RsvpRecord[];
}

/** Record a premium-tier interest lead (the payment fake-door). Returns the row id. */
export function addPremiumInterest(clean: CleanPremiumInterest): number {
  const info = db()
    .prepare(
      `INSERT INTO premium_interest (tier, name, phone, locale, comment)
       VALUES (@tier, @name, @phone, @locale, @comment)`,
    )
    .run({
      tier: clean.tier,
      name: clean.name,
      phone: clean.phone,
      locale: clean.locale,
      comment: clean.comment,
    });
  return Number(info.lastInsertRowid);
}
