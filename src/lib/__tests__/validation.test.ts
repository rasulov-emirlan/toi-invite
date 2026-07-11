import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, validateInvite, validateRsvp, LIMITS } from "../validation";
import type { InviteInput, RsvpInput } from "../types";

const goodInvite: InviteInput = {
  event_type: "wedding",
  template: "gold",
  locale: "ky",
  honoree: "Азамат",
  partner: "Айпери",
  event_date: "2026-09-12",
  event_time: "17:00",
  venue_name: "Той-хан «Ала-Тоо»",
  venue_map_url: "https://2gis.kg/bishkek/geo/123",
  greeting: "Кош келиңиздер!",
};

describe("validateInvite", () => {
  it("accepts a well-formed invite and trims strings", () => {
    const res = validateInvite({ ...goodInvite, honoree: "  Азамат  " });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.honoree).toBe("Азамат");
      expect(res.value.partner).toBe("Айпери");
      expect(res.value.venue_map_url).toBe("https://2gis.kg/bishkek/geo/123");
    }
  });

  it("treats blank partner / map / greeting as optional", () => {
    const res = validateInvite({
      ...goodInvite,
      partner: "   ",
      venue_map_url: "",
      greeting: "",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.partner).toBeNull();
      expect(res.value.venue_map_url).toBeNull();
      expect(res.value.greeting).toBe("");
    }
  });

  it("rejects an unknown event type", () => {
    const res = validateInvite({ ...goodInvite, event_type: "birthday" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain("event_type");
  });

  it("rejects an unknown template and locale", () => {
    const res = validateInvite({ ...goodInvite, template: "neon", locale: "en" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toContain("template");
      expect(res.errors).toContain("locale");
    }
  });

  it("requires a honoree name", () => {
    const res = validateInvite({ ...goodInvite, honoree: "   " });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain("honoree");
  });

  it("rejects impossible dates", () => {
    for (const bad of ["2026-13-01", "2026-02-30", "12-09-2026", "2026/09/12", ""]) {
      const res = validateInvite({ ...goodInvite, event_date: bad });
      expect(res.ok, `date ${bad}`).toBe(false);
      if (!res.ok) expect(res.errors).toContain("event_date");
    }
  });

  it("accepts a real leap day and rejects a non-leap Feb 29", () => {
    expect(validateInvite({ ...goodInvite, event_date: "2028-02-29" }).ok).toBe(true);
    expect(validateInvite({ ...goodInvite, event_date: "2027-02-29" }).ok).toBe(false);
  });

  it("rejects malformed times", () => {
    for (const bad of ["24:00", "9:00", "17:60", "1700", ""]) {
      const res = validateInvite({ ...goodInvite, event_time: bad });
      expect(res.ok, `time ${bad}`).toBe(false);
      if (!res.ok) expect(res.errors).toContain("event_time");
    }
  });

  it("rejects a non-http map url (blocks javascript:)", () => {
    const res = validateInvite({
      ...goodInvite,
      venue_map_url: "javascript:alert(1)",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain("venue_map_url");
  });

  it("rejects an over-long greeting", () => {
    const res = validateInvite({ ...goodInvite, greeting: "x".repeat(LIMITS.greeting + 1) });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain("greeting");
  });

  it("accepts and trims optional wedding details", () => {
    const res = validateInvite({
      ...goodInvite,
      dress_code: "  Пастельные оттенки  ",
      contact_name: "  Айжан  ",
      contact_phone: "  +996 555 00 00 00  ",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.dress_code).toBe("Пастельные оттенки");
      expect(res.value.contact_name).toBe("Айжан");
      expect(res.value.contact_phone).toBe("+996 555 00 00 00");
    }
  });

  it("rejects over-long optional wedding details", () => {
    const res = validateInvite({ ...goodInvite, dress_code: "x".repeat(LIMITS.dressCode + 1) });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain("dress_code");
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("https://2gis.kg/x")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });
  it("rejects other schemes and garbage", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,x")).toBe(false);
    expect(isSafeHttpUrl("ftp://x")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});

describe("validateRsvp", () => {
  const good: RsvpInput = { guest_name: "Нургуль", attendance: "yes", guests_count: 2 };

  it("accepts a valid yes and trims the name", () => {
    const res = validateRsvp({ ...good, guest_name: "  Нургуль " });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.guest_name).toBe("Нургуль");
      expect(res.value.guests_count).toBe(2);
    }
  });

  it("coerces a numeric string guest count", () => {
    const res = validateRsvp({ ...good, guests_count: "3" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.guests_count).toBe(3);
  });

  it("requires a guest name", () => {
    const res = validateRsvp({ ...good, guest_name: "  " });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain("guest_name");
  });

  it("rejects a bad attendance value", () => {
    const res = validateRsvp({ ...good, attendance: "maybe" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain("attendance");
  });

  it("rejects guest counts out of range and non-integers", () => {
    for (const bad of [0, -1, LIMITS.maxGuests + 1, 2.5, "abc"]) {
      const res = validateRsvp({ ...good, guests_count: bad as number });
      expect(res.ok, `count ${bad}`).toBe(false);
      if (!res.ok) expect(res.errors).toContain("guests_count");
    }
  });
});
