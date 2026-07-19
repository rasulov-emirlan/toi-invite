import "server-only";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  Attendance,
  EventTypeKey,
  GiftRecord,
  InviteRecord,
  InvitedGuestRecord,
  Locale,
  PremiumInterestRecord,
  PremiumTierKey,
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
    CREATE TABLE IF NOT EXISTS gifts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      invite_slug  TEXT NOT NULL REFERENCES invites(slug) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      claimed_ref  TEXT,
      claimed_name TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      claimed_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_gifts_slug ON gifts(invite_slug);
    CREATE TABLE IF NOT EXISTS premium_interest (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tier       TEXT NOT NULL,
      name       TEXT NOT NULL,
      phone      TEXT NOT NULL,
      locale     TEXT NOT NULL,
      comment    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invited_guests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      invite_slug TEXT NOT NULL REFERENCES invites(slug) ON DELETE CASCADE,
      -- Personal-link capability: unguessable, so one guest's link can't be
      -- varied into another guest's (an integer id would be enumerable).
      token       TEXT NOT NULL,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      opened_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_invited_guests_slug ON invited_guests(invite_slug);
    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      slug       TEXT,
      ref        TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_name_time ON events(name, created_at);
  `);
  migrateRsvps(handle);
  migrateInvites(handle);
  migrateInvitedGuests(handle);
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
  if (!cols.has("invited_guest_id")) {
    handle.exec("ALTER TABLE rsvps ADD COLUMN invited_guest_id INTEGER");
  }
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_slug_ref
     ON rsvps(invite_slug, guest_ref) WHERE guest_ref IS NOT NULL`,
  );
}

/**
 * Additive invites migrations for databases created before these columns
 * existed. All nullable — legacy invites simply render without the new blocks.
 */
function migrateInvites(handle: Database.Database) {
  const cols = new Set(
    (handle.pragma("table_info(invites)") as Array<{ name: string }>).map((c) => c.name),
  );
  const add = (name: string, ddl: string) => {
    if (!cols.has(name)) handle.exec(`ALTER TABLE invites ADD COLUMN ${name} ${ddl}`);
  };
  add("greeting_ru", "TEXT");
  add("greeting_ky", "TEXT");
  add("host_phone", "TEXT");
  add("landmark", "TEXT");
  add("rsvp_deadline", "TEXT");
  add("dress_code", "TEXT");
  add("program_json", "TEXT");
  add("photo_id", "TEXT");
  add("organizer_ref", "TEXT");
  add("created_ref", "TEXT");
  handle.exec(
    `CREATE INDEX IF NOT EXISTS idx_invites_organizer_ref
     ON invites(organizer_ref) WHERE organizer_ref IS NOT NULL`,
  );
}

export function createInvite(
  clean: CleanInvite,
  organizerRef: string | null = null,
): { slug: string; token: string } {
  const conn = db();
  const token = generateToken();
  const insert = conn.prepare(`
    INSERT INTO invites
      (slug, organizer_token, event_type, template, locale, honoree, partner,
       event_date, event_time, venue_name, venue_map_url, greeting,
       greeting_ru, greeting_ky, host_phone, landmark, rsvp_deadline,
       dress_code, program_json, photo_id, organizer_ref, created_ref)
    VALUES
      (@slug, @organizer_token, @event_type, @template, @locale, @honoree, @partner,
       @event_date, @event_time, @venue_name, @venue_map_url, @greeting,
       @greeting_ru, @greeting_ky, @host_phone, @landmark, @rsvp_deadline,
       @dress_code, @program_json, @photo_id, @organizer_ref, @created_ref)
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
        greeting_ru: clean.greeting_ru,
        greeting_ky: clean.greeting_ky,
        host_phone: clean.host_phone,
        landmark: clean.landmark,
        rsvp_deadline: clean.rsvp_deadline,
        dress_code: clean.dress_code,
        program_json: clean.program_json,
        photo_id: clean.photo_id,
        organizer_ref: organizerRef,
        created_ref: clean.created_ref,
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

/** Full-replace update of an invite's editable fields (attribution is not editable). */
export function updateInvite(slug: string, clean: CleanInvite): boolean {
  const { created_ref: _ref, ...editable } = clean;
  const info = db()
    .prepare(
      `UPDATE invites
       SET event_type = @event_type, template = @template, locale = @locale,
           honoree = @honoree, partner = @partner, event_date = @event_date,
           event_time = @event_time, venue_name = @venue_name,
           venue_map_url = @venue_map_url, greeting = @greeting,
           greeting_ru = @greeting_ru, greeting_ky = @greeting_ky,
           host_phone = @host_phone, landmark = @landmark,
           rsvp_deadline = @rsvp_deadline, dress_code = @dress_code,
           program_json = @program_json, photo_id = @photo_id
       WHERE slug = @slug`,
    )
    .run({ slug, ...editable });
  return info.changes > 0;
}

/** Whether any invite references this uploaded photo (upload GC uses this). */
export function isPhotoReferenced(photoId: string): boolean {
  return Boolean(
    db().prepare("SELECT 1 FROM invites WHERE photo_id = ? LIMIT 1").get(photoId),
  );
}

/** Invites created from the same browser (HttpOnly organizer cookie), newest first. */
export function listInvitesByOrganizerRef(ref: string, limit = 20): InviteRecord[] {
  return db()
    .prepare(
      `SELECT * FROM invites WHERE organizer_ref = ?
       ORDER BY created_at DESC, slug DESC LIMIT ?`,
    )
    .all(ref, limit) as InviteRecord[];
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
    invited_guest_token: string | null;
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
    // Only trust the guest-list link when the capability token resolves for
    // THIS invite — otherwise a crafted RSVP could light up someone's board.
    const gid = data.invited_guest_token
      ? ((conn
          .prepare("SELECT id FROM invited_guests WHERE invite_slug = ? AND token = ?")
          .get(slug, data.invited_guest_token) as { id: number } | undefined)?.id ?? null)
      : null;
    if (prior) {
      conn
        .prepare(
          // COALESCE(existing, new): the first personal-link association wins;
          // a later submit from the same browser can't reassign the answer to
          // a different guest row.
          `UPDATE rsvps
           SET guest_name = ?, attendance = ?, guests_count = ?, wish = ?,
               invited_guest_id = COALESCE(invited_guest_id, ?),
               created_at = datetime('now')
           WHERE id = ?`,
        )
        .run(data.guest_name, data.attendance, data.guests_count, data.wish, gid, prior.id);
    } else {
      conn
        .prepare(
          `INSERT INTO rsvps (invite_slug, guest_name, guest_ref, attendance, guests_count, wish, invited_guest_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(slug, data.guest_name, data.guest_ref, data.attendance, data.guests_count, data.wish, gid);
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

// ---------- gift wishlist ----------

export function listGifts(slug: string): GiftRecord[] {
  return db()
    .prepare("SELECT * FROM gifts WHERE invite_slug = ? ORDER BY id")
    .all(slug) as GiftRecord[];
}

const MAX_GIFTS_PER_INVITE = 50;

/** Organizer adds an item. Returns the new id, or null when the invite is
 *  missing or the list is full. */
export function addGift(slug: string, title: string): number | null {
  const conn = db();
  const insert = conn.transaction((): number | null => {
    const exists = conn.prepare("SELECT 1 FROM invites WHERE slug = ?").get(slug);
    if (!exists) return null;
    const { c } = conn
      .prepare("SELECT COUNT(*) c FROM gifts WHERE invite_slug = ?")
      .get(slug) as { c: number };
    if (c >= MAX_GIFTS_PER_INVITE) return null;
    const info = conn
      .prepare("INSERT INTO gifts (invite_slug, title) VALUES (?, ?)")
      .run(slug, title);
    return Number(info.lastInsertRowid);
  });
  return insert();
}

export function deleteGift(slug: string, id: number): boolean {
  const info = db()
    .prepare("DELETE FROM gifts WHERE id = ? AND invite_slug = ?")
    .run(id, slug);
  return info.changes > 0;
}

export type ClaimResult = "claimed" | "taken" | "not_found";

/** Guest reserves an item — atomic, first tap wins. */
export function claimGift(
  slug: string,
  id: number,
  guestRef: string,
  guestName: string | null,
): ClaimResult {
  const conn = db();
  const info = conn
    .prepare(
      `UPDATE gifts
       SET claimed_ref = ?, claimed_name = ?, claimed_at = datetime('now')
       WHERE id = ? AND invite_slug = ? AND claimed_ref IS NULL`,
    )
    .run(guestRef, guestName, id, slug);
  if (info.changes > 0) return "claimed";
  const row = conn
    .prepare("SELECT claimed_ref FROM gifts WHERE id = ? AND invite_slug = ?")
    .get(id, slug) as { claimed_ref: string | null } | undefined;
  if (!row) return "not_found";
  // Tapping your own reserved item again is a no-op success, not a conflict.
  return row.claimed_ref === guestRef ? "claimed" : "taken";
}

/** Guest releases their own reservation; the organizer (byOrganizer) can free any. */
export function unclaimGift(
  slug: string,
  id: number,
  guestRef: string | null,
  byOrganizer: boolean,
): boolean {
  const conn = db();
  const info = byOrganizer
    ? conn
        .prepare(
          `UPDATE gifts SET claimed_ref = NULL, claimed_name = NULL, claimed_at = NULL
           WHERE id = ? AND invite_slug = ?`,
        )
        .run(id, slug)
    : conn
        .prepare(
          `UPDATE gifts SET claimed_ref = NULL, claimed_name = NULL, claimed_at = NULL
           WHERE id = ? AND invite_slug = ? AND claimed_ref = ?`,
        )
        .run(id, slug, guestRef);
  return info.changes > 0;
}

// ---------- invited guests (organizer guest list) ----------

const MAX_INVITED_PER_INVITE = 300;

const GUEST_TOKEN_LENGTH = 12;

/**
 * A database created before invited_guests carried capability tokens gets the
 * column added and every existing row backfilled with a fresh token — the
 * unique index can only be created after that, so it lives here rather than in
 * the CREATE block.
 */
function migrateInvitedGuests(handle: Database.Database) {
  const cols = new Set(
    (handle.pragma("table_info(invited_guests)") as Array<{ name: string }>).map(
      (c) => c.name,
    ),
  );
  if (!cols.has("token")) {
    handle.exec("ALTER TABLE invited_guests ADD COLUMN token TEXT");
    const rows = handle.prepare("SELECT id FROM invited_guests WHERE token IS NULL").all() as Array<{ id: number }>;
    const set = handle.prepare("UPDATE invited_guests SET token = ? WHERE id = ?");
    for (const r of rows) set.run(generateSlug(GUEST_TOKEN_LENGTH), r.id);
  }
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_invited_guests_token
     ON invited_guests(invite_slug, token)`,
  );
}

/** Organizer adds a guest to the list. Returns the new id, or null when the
 *  invite is missing or the list is full. */
export function addInvitedGuest(slug: string, name: string): number | null {
  const conn = db();
  const insert = conn.transaction((): number | null => {
    const exists = conn.prepare("SELECT 1 FROM invites WHERE slug = ?").get(slug);
    if (!exists) return null;
    const { c } = conn
      .prepare("SELECT COUNT(*) c FROM invited_guests WHERE invite_slug = ?")
      .get(slug) as { c: number };
    if (c >= MAX_INVITED_PER_INVITE) return null;
    const info = conn
      .prepare("INSERT INTO invited_guests (invite_slug, token, name) VALUES (?, ?, ?)")
      .run(slug, generateSlug(GUEST_TOKEN_LENGTH), name);
    return Number(info.lastInsertRowid);
  });
  return insert();
}

export function listInvitedGuests(slug: string): InvitedGuestRecord[] {
  return db()
    .prepare("SELECT * FROM invited_guests WHERE invite_slug = ? ORDER BY id")
    .all(slug) as InvitedGuestRecord[];
}

export function deleteInvitedGuest(slug: string, id: number): boolean {
  const info = db()
    .prepare("DELETE FROM invited_guests WHERE id = ? AND invite_slug = ?")
    .run(id, slug);
  return info.changes > 0;
}

/** Resolve a personal-link token to the internal guest id (null if unknown). */
export function resolveInvitedGuest(slug: string, token: string): number | null {
  const row = db()
    .prepare("SELECT id FROM invited_guests WHERE invite_slug = ? AND token = ?")
    .get(slug, token) as { id: number } | undefined;
  return row?.id ?? null;
}

/** First open of a personal link stamps opened_at; later opens keep the first.
 *  Returns true only for the stamping open, so callers can count it once. */
export function markInvitedGuestOpened(slug: string, token: string): boolean {
  const info = db()
    .prepare(
      `UPDATE invited_guests SET opened_at = datetime('now')
       WHERE invite_slug = ? AND token = ? AND opened_at IS NULL`,
    )
    .run(slug, token);
  return info.changes > 0;
}

export interface GuestBoardRow {
  id: number;
  token: string;
  name: string;
  opened_at: string | null;
  attendance: Attendance | null;
  guests_count: number | null;
}

/**
 * The organizer's board: every invited guest joined with their latest linked
 * RSVP. "Latest" is by created_at (upserts refresh it), not by row id — two
 * browsers on one personal link create two rows, and the newest ANSWER must
 * win even when the older row was updated later.
 */
export function listGuestBoard(slug: string): GuestBoardRow[] {
  return db()
    .prepare(
      `SELECT g.id, g.token, g.name, g.opened_at, r.attendance, r.guests_count
       FROM invited_guests g
       LEFT JOIN rsvps r ON r.id = (
         SELECT id FROM rsvps
         WHERE invited_guest_id = g.id AND invite_slug = g.invite_slug
         ORDER BY created_at DESC, id DESC LIMIT 1
       )
       WHERE g.invite_slug = ?
       ORDER BY g.id`,
    )
    .all(slug) as GuestBoardRow[];
}

// ---------- first-party analytics ----------

/** Retention: keep raw events 90 days; prune opportunistically, ≤ once/hour. */
const EVENTS_RETENTION_DAYS = 90;
let lastEventsPruneMs = 0;

/** Append-only product event. Never throws — analytics must not break a request. */
export function logEvent(name: string, slug: string | null = null, ref: string | null = null): void {
  try {
    const conn = db();
    conn.prepare("INSERT INTO events (name, slug, ref) VALUES (?, ?, ?)").run(name, slug, ref);
    const now = Date.now();
    if (now - lastEventsPruneMs > 3600_000) {
      lastEventsPruneMs = now;
      conn
        .prepare("DELETE FROM events WHERE created_at < datetime('now', ?)")
        .run(`-${EVENTS_RETENTION_DAYS} days`);
    }
  } catch (err) {
    console.error("logEvent failed", err);
  }
}

export interface StatsSummary {
  invites_total: number;
  rsvps_total: number;
  premium_leads_total: number;
  /** Per event name: all-time and last-7-days counts. */
  events: Array<{ name: string; total: number; last7d: number }>;
  /** Most-viewed invites, last 30 days. */
  top_invites: Array<{ slug: string; views: number }>;
  /** Invites attributed to a viral-loop ref. */
  created_via_ref: number;
}

export function statsSummary(): StatsSummary {
  const conn = db();
  const one = (sql: string): number =>
    (conn.prepare(sql).get() as { c: number }).c;
  return {
    invites_total: one("SELECT COUNT(*) c FROM invites"),
    rsvps_total: one("SELECT COUNT(*) c FROM rsvps"),
    premium_leads_total: one("SELECT COUNT(*) c FROM premium_interest"),
    events: conn
      .prepare(
        `SELECT name, COUNT(*) total,
                SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) last7d
         FROM events GROUP BY name ORDER BY total DESC`,
      )
      .all() as StatsSummary["events"],
    top_invites: conn
      .prepare(
        `SELECT slug, COUNT(*) views FROM events
         WHERE name = 'invite_view' AND slug IS NOT NULL
           AND created_at >= datetime('now', '-30 days')
         GROUP BY slug ORDER BY views DESC LIMIT 10`,
      )
      .all() as StatsSummary["top_invites"],
    created_via_ref: one(
      "SELECT COUNT(*) c FROM invites WHERE created_ref IS NOT NULL",
    ),
  };
}

/** All premium-interest leads, newest first (the fake-door's output). */
export function listPremiumInterest(): PremiumInterestRecord[] {
  const rows = db()
    .prepare("SELECT * FROM premium_interest ORDER BY id DESC")
    .all() as Array<
    Omit<PremiumInterestRecord, "tier" | "locale"> & { tier: string; locale: string }
  >;
  return rows.map((r) => ({
    ...r,
    tier: r.tier as PremiumTierKey,
    locale: r.locale as Locale,
  }));
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
