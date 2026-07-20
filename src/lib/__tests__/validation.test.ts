import { describe, expect, it } from "vitest";
import {
  cleanMoneyGifts,
  isSafeHttpUrl,
  moneyGiftsFromJson,
  normalizeMapUrl,
  programFromJson,
  validateInvite,
  validateRsvp,
  LIMITS,
} from "../validation";
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

describe("validateRsvp wish", () => {
  const base = { guest_name: "Айбек", attendance: "yes", guests_count: 2 };

  it("accepts a trimmed wish and nulls an empty one", () => {
    const withWish = validateRsvp({ ...base, wish: "  Бактылуу болгула!  " });
    expect(withWish.ok && withWish.value.wish).toBe("Бактылуу болгула!");
    const empty = validateRsvp({ ...base, wish: "   " });
    expect(empty.ok && empty.value.wish).toBe(null);
    const missing = validateRsvp(base);
    expect(missing.ok && missing.value.wish).toBe(null);
  });

  it("rejects a wish over the limit", () => {
    const r = validateRsvp({ ...base, wish: "ж".repeat(301) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("wish");
  });
});

describe("validateRsvp guest_ref", () => {
  const base = { guest_name: "Айбек", attendance: "yes", guests_count: 2 };

  it("accepts a uuid-shaped ref and nulls junk without rejecting the RSVP", () => {
    const good = validateRsvp({ ...base, guest_ref: "3f2c9a10-1b2c-4d5e-8f90-abcdef123456" });
    expect(good.ok && good.value.guest_ref).toBe("3f2c9a10-1b2c-4d5e-8f90-abcdef123456");
    const junk = validateRsvp({ ...base, guest_ref: "<script>" });
    expect(junk.ok && junk.value.guest_ref).toBe(null);
    const tooShort = validateRsvp({ ...base, guest_ref: "abc" });
    expect(tooShort.ok && tooShort.value.guest_ref).toBe(null);
    const missing = validateRsvp(base);
    expect(missing.ok && missing.value.guest_ref).toBe(null);
  });
});

describe("null/array bodies", () => {
  it("rejects non-object bodies cleanly instead of throwing", () => {
    for (const bad of [null, undefined, [], "x", 42]) {
      const r1 = validateRsvp(bad as unknown as RsvpInput);
      expect(r1.ok).toBe(false);
      const r2 = validateInvite(bad as unknown as InviteInput);
      expect(r2.ok).toBe(false);
    }
  });
});

describe("validateInvite new fields", () => {
  it("accepts the full rich-field set and normalizes the phone", () => {
    const r = validateInvite({
      ...goodInvite,
      greeting_ru: "Дорогие гости!",
      greeting_ky: "Кымбаттуу меймандар!",
      host_phone: "0555 123 456",
      landmark: "Рядом с филармонией",
      rsvp_deadline: "2026-09-01",
      dress_code: "Нарядная одежда",
      program: [
        { time: "17:00", title: "Встреча гостей" },
        { time: "", title: "Той башталышы" },
      ],
      photo_id: "abc123def456",
      created_ref: "abcd2345",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.host_phone).toBe("+996555123456");
      expect(r.value.greeting_ky).toBe("Кымбаттуу меймандар!");
      expect(r.value.rsvp_deadline).toBe("2026-09-01");
      expect(JSON.parse(r.value.program_json!)).toHaveLength(2);
      expect(r.value.photo_id).toBe("abc123def456");
      expect(r.value.created_ref).toBe("abcd2345");
    }
  });

  it("treats all new fields as optional (legacy body still validates)", () => {
    const r = validateInvite(goodInvite);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.greeting_ru).toBe(null);
      expect(r.value.host_phone).toBe(null);
      expect(r.value.program_json).toBe(null);
      expect(r.value.created_ref).toBe(null);
    }
  });

  it("rejects an unparseable host phone but nulls a junk created_ref silently", () => {
    const bad = validateInvite({ ...goodInvite, host_phone: "12345" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors).toContain("host_phone");
    const ref = validateInvite({ ...goodInvite, created_ref: "<script>alert(1)</script>" });
    expect(ref.ok && ref.value.created_ref).toBe(null);
  });

  it("rejects malformed programs and bad photo ids", () => {
    const badTime = validateInvite({
      ...goodInvite,
      program: [{ time: "25:99", title: "x" }],
    });
    expect(!badTime.ok && badTime.errors.includes("program")).toBe(true);
    const notArray = validateInvite({ ...goodInvite, program: "17:00 встреча" });
    expect(!notArray.ok && notArray.errors.includes("program")).toBe(true);
    const badPhoto = validateInvite({ ...goodInvite, photo_id: "../etc/passwd" });
    expect(!badPhoto.ok && badPhoto.errors.includes("photo_id")).toBe(true);
  });

  it("skips blank program rows and rejects overlong programs", () => {
    const blanks = validateInvite({
      ...goodInvite,
      program: [{ time: "", title: "" }, { time: "18:00", title: "Той" }],
    });
    expect(blanks.ok).toBe(true);
    if (blanks.ok) expect(JSON.parse(blanks.value.program_json!)).toHaveLength(1);
    const tooMany = validateInvite({
      ...goodInvite,
      program: Array.from({ length: 13 }, (_, i) => ({ time: "10:00", title: `п${i}` })),
    });
    expect(!tooMany.ok && tooMany.errors.includes("program")).toBe(true);
  });
});

describe("rsvp_deadline bounds", () => {
  it("rejects a deadline after the event date", () => {
    const r = validateInvite({ ...goodInvite, rsvp_deadline: "2099-01-01" });
    expect(!r.ok && r.errors.includes("rsvp_deadline")).toBe(true);
  });
  it("accepts a deadline on or before the event date", () => {
    const r = validateInvite({ ...goodInvite, rsvp_deadline: goodInvite.event_date });
    expect(r.ok && r.value.rsvp_deadline).toBe(goodInvite.event_date);
  });
});

describe("normalizeMapUrl", () => {
  it("prepends https:// to bare share-sheet hosts and leaves full URLs alone", () => {
    expect(normalizeMapUrl("go.2gis.com/abcd")).toBe("https://go.2gis.com/abcd");
    expect(normalizeMapUrl("2gis.kg/bishkek/geo/123")).toBe("https://2gis.kg/bishkek/geo/123");
    expect(normalizeMapUrl("https://go.2gis.com/abcd")).toBe("https://go.2gis.com/abcd");
    expect(normalizeMapUrl("maps.app.goo.gl/XyZ")).toBe("https://maps.app.goo.gl/XyZ");
  });
  it("does not rescue junk into a URL", () => {
    expect(normalizeMapUrl("рядом с филармонией")).toBe("рядом с филармонией");
    expect(normalizeMapUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
    expect(isSafeHttpUrl(normalizeMapUrl("javascript:alert(1)"))).toBe(false);
  });
});

describe("money gifts (реквизиты)", () => {
  it("accepts requisites through validateInvite and canonicalizes them", () => {
    const r = validateInvite({
      ...goodInvite,
      money_gifts: [
        { label: "mbank", value: "0555 123 456" },
        { label: "Optima", value: "4169 5853 1234 5678" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(JSON.parse(r.value.money_gifts_json!)).toEqual([
        { label: "mbank", value: "0555 123 456" },
        { label: "Optima", value: "4169 5853 1234 5678" },
      ]);
    }
  });

  it("is optional: absent input stays null", () => {
    const r = validateInvite(goodInvite);
    expect(r.ok && r.value.money_gifts_json).toBe(null);
    expect(cleanMoneyGifts(undefined)).toBe(null);
    expect(cleanMoneyGifts(null)).toBe(null);
  });

  it("skips blank rows but rejects half-filled ones", () => {
    const blanks = cleanMoneyGifts([
      { label: "", value: "" },
      { label: "mbank", value: "0555" },
    ]);
    expect(JSON.parse(blanks!)).toHaveLength(1);
    expect(cleanMoneyGifts([{ label: "mbank", value: "" }])).toBe(undefined);
    expect(cleanMoneyGifts([{ label: "", value: "0555" }])).toBe(undefined);
  });

  it("rejects malformed shapes and overflow via validateInvite", () => {
    for (const bad of ["mbank 0555", { label: "x", value: "y" }, [null], [["a"]]]) {
      const r = validateInvite({ ...goodInvite, money_gifts: bad });
      expect(!r.ok && r.errors.includes("money_gifts")).toBe(true);
    }
    const tooMany = cleanMoneyGifts(
      Array.from({ length: LIMITS.moneyGiftItems + 1 }, (_, i) => ({
        label: `банк${i}`,
        value: "0555",
      })),
    );
    expect(tooMany).toBe(undefined);
    expect(
      cleanMoneyGifts([{ label: "x".repeat(LIMITS.moneyGiftLabel + 1), value: "1" }]),
    ).toBe(undefined);
    expect(
      cleanMoneyGifts([{ label: "mbank", value: "1".repeat(LIMITS.moneyGiftValue + 1) }]),
    ).toBe(undefined);
  });

  it("moneyGiftsFromJson round-trips and degrades to empty on junk", () => {
    const json = JSON.stringify([{ label: "mbank", value: "0555 123 456" }]);
    expect(moneyGiftsFromJson(json)).toEqual([{ label: "mbank", value: "0555 123 456" }]);
    expect(moneyGiftsFromJson(null)).toEqual([]);
    expect(moneyGiftsFromJson("not json")).toEqual([]);
    expect(moneyGiftsFromJson('{"a":1}')).toEqual([]);
  });
});

describe("programFromJson", () => {
  it("round-trips and degrades to empty on junk", () => {
    const json = JSON.stringify([{ time: "17:00", title: "Встреча" }]);
    expect(programFromJson(json)).toEqual([{ time: "17:00", title: "Встреча" }]);
    expect(programFromJson(null)).toEqual([]);
    expect(programFromJson("not json")).toEqual([]);
    expect(programFromJson('{"a":1}')).toEqual([]);
  });
});

describe("validateRsvp invited_guest (personal-link token)", () => {
  const base = { guest_name: "Айбек", attendance: "yes", guests_count: 2 };
  it("accepts a slug-alphabet token and nulls junk without rejecting", () => {
    const good = validateRsvp({ ...base, invited_guest: "abc234xyz987" });
    expect(good.ok && good.value.invited_guest_token).toBe("abc234xyz987");
    for (const junk of ["ab", "UPPER-case!", "../../etc", 7, null, undefined]) {
      const r = validateRsvp({ ...base, invited_guest: junk as never });
      expect(r.ok && r.value.invited_guest_token).toBe(null);
    }
  });
});
