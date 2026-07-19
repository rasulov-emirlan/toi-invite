import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CleanInvite } from "../validation";

vi.mock("server-only", () => ({}));

const dbPath = join(tmpdir(), `toi-invite-db-${process.pid}-${Date.now()}.sqlite`);
let api!: typeof import("../db");

const invite: CleanInvite = {
  event_type: "wedding", template: "gold", locale: "ru", honoree: "Айбек", partner: "Нургүл",
  event_date: "2026-09-20", event_time: "18:00", venue_name: "Ала-Тоо", venue_map_url: null,
  greeting: "Будем рады видеть вас", greeting_ru: null, greeting_ky: null, host_phone: null,
  landmark: null, rsvp_deadline: null, dress_code: null, program_json: null, photo_id: null, created_ref: null,
};

beforeAll(async () => {
  process.env.DB_PATH = dbPath;
  vi.resetModules();
  api = await import("../db");
});

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    const path = dbPath + suffix;
    if (existsSync(path)) unlinkSync(path);
  }
  delete process.env.DB_PATH;
});

const rsvp = (guest_ref: string | null, invited_guest_token: string | null, extra = {}) => ({
  guest_name: "Гость", attendance: "yes" as const, guests_count: 2, wish: null, guest_ref, invited_guest_token, ...extra,
});

describe("db", () => {
  it("round-trips an invite", () => {
    const created = api.createInvite(invite);
    expect(api.getInvite(created.slug)).toMatchObject({ slug: created.slug, organizer_token: created.token, honoree: invite.honoree });
    expect(api.getInvite("missing-slug")).toBeNull();
  });

  it("inserts and updates one RSVP per guest_ref", () => {
    const slug = api.createInvite(invite).slug;
    expect(api.addRsvp(slug, rsvp("browser-1", null))).toBe(true);
    expect(api.addRsvp(slug, rsvp("browser-1", null, { guest_name: "Исправленный", attendance: "no", guests_count: 1 }))).toBe(true);
    expect(api.listRsvps(slug)).toHaveLength(1);
    expect(api.listRsvps(slug)[0]).toMatchObject({ guest_name: "Исправленный", attendance: "no", guests_count: 1 });
  });

  it("keeps the first invited guest association", () => {
    const slug = api.createInvite(invite).slug;
    const firstId = api.addInvitedGuest(slug, "Первый")!;
    const secondId = api.addInvitedGuest(slug, "Второй")!;
    const guests = api.listInvitedGuests(slug);
    const firstToken = guests.find((g) => g.id === firstId)!.token;
    const secondToken = guests.find((g) => g.id === secondId)!.token;
    api.addRsvp(slug, rsvp("same", firstToken));
    api.addRsvp(slug, rsvp("same", secondToken, { guest_name: "Снова", guests_count: 4 }));
    expect(api.listRsvps(slug)[0].invited_guest_id).toBe(firstId);
    expect(api.addRsvp("does-not-exist", rsvp(null, null))).toBe(false);
  });

  it("builds a guest board with latest linked answers", () => {
    const slug = api.createInvite(invite).slug;
    const firstId = api.addInvitedGuest(slug, "Первый")!;
    const secondId = api.addInvitedGuest(slug, "Второй")!;
    const guests = api.listInvitedGuests(slug);
    const firstToken = guests.find((g) => g.id === firstId)!.token;
    const secondToken = guests.find((g) => g.id === secondId)!.token;
    expect(api.listGuestBoard(slug).map((g) => g.attendance)).toEqual([null, null]);
    api.addRsvp(slug, rsvp("a", firstToken, { attendance: "no", guests_count: 1 }));
    api.addRsvp(slug, rsvp("b", firstToken, { guests_count: 5 }));
    api.addRsvp(slug, rsvp("c", secondToken, { guests_count: 3 }));
    expect(api.listGuestBoard(slug)).toMatchObject([
      { id: firstId, attendance: "yes", guests_count: 5 },
      { id: secondId, attendance: "yes", guests_count: 3 },
    ]);
  });

  it("claims and unclaims gifts", () => {
    const slug = api.createInvite(invite).slug;
    const id = api.addGift(slug, "Самовар")!;
    expect(api.listGifts(slug)).toHaveLength(1);
    expect(api.claimGift(slug, id, "ref-a", "А")).toBe("claimed");
    expect(api.claimGift(slug, id, "ref-b", "Б")).toBe("taken");
    expect(api.claimGift(slug, id, "ref-a", "А")).toBe("claimed");
    expect(api.claimGift(slug, 999999, "ref-a", "А")).toBe("not_found");
    expect(api.unclaimGift(slug, id, "ref-b", false)).toBe(false);
    expect(api.unclaimGift(slug, id, "ref-a", false)).toBe(true);
    expect(api.claimGift(slug, id, "ref-b", "Б")).toBe("claimed");
    expect(api.unclaimGift(slug, id, null, true)).toBe(true);
  });

  it("marks an invited guest opened once", () => {
    const slug = api.createInvite(invite).slug;
    api.addInvitedGuest(slug, "Открывший");
    const token = api.listInvitedGuests(slug)[0].token;
    expect(api.markInvitedGuestOpened(slug, token)).toBe(true);
    expect(api.markInvitedGuestOpened(slug, token)).toBe(false);
  });
});

describe("payments", () => {
  const pid = "11111111-2222-4333-8444-555555555555";

  it("creates, finalizes once, and refuses to flip a settled payment", () => {
    const slug = api.createInvite(invite).slug;
    api.createPayment({
      id: pid, tier: "premium", amount_som: 990,
      name: "Азамат", phone: "+996555123456", locale: "ru", invite_slug: slug,
    });
    expect(api.getPayment(pid)?.status).toBe("pending");

    const settled = api.finalizePayment(pid, "succeeded", "{}");
    expect(settled?.status).toBe("succeeded");
    // replayed webhook with the same status is idempotent
    expect(api.finalizePayment(pid, "succeeded", "{}")?.status).toBe("succeeded");
    // but a contradictory status cannot flip it
    expect(api.finalizePayment(pid, "failed", "{}")).toBeNull();
    expect(api.getPayment(pid)?.status).toBe("succeeded");
  });

  it("activates the paid tier on the invite", () => {
    const slug = api.createInvite(invite).slug;
    expect(api.getInvite(slug)?.premium_tier).toBeNull();
    expect(api.setInvitePremium(slug, "premium")).toBe(true);
    expect(api.getInvite(slug)?.premium_tier).toBe("premium");
    expect(api.setInvitePremium("missing-slug", "premium")).toBe(false);
  });

  it("returns null for an unknown payment id", () => {
    expect(api.getPayment("99999999-9999-4999-8999-999999999999")).toBeNull();
    expect(api.finalizePayment("99999999-9999-4999-8999-999999999999", "failed", null)).toBeNull();
  });
});
