import { describe, expect, it } from "vitest";
import {
  displayNames,
  eventLabel,
  formatEventDate,
  inviteTitle,
} from "../invite-view";
import type { InviteRecord } from "../types";

const base: InviteRecord = {
  slug: "abcd2345",
  organizer_token: "tok",
  event_type: "wedding",
  template: "gold",
  locale: "ky",
  honoree: "Азамат",
  partner: "Айпери",
  event_date: "2026-09-12",
  event_time: "17:00",
  venue_name: "Ала-Тоо",
  venue_map_url: null,
  greeting: "Кош келиңиздер",
  greeting_ru: null,
  greeting_ky: null,
  host_phone: null,
  landmark: null,
  rsvp_deadline: null,
  dress_code: null,
  program_json: null,
  photo_id: null,
  organizer_ref: null,
  created_ref: null,
  premium_tier: null,
  created_at: "2026-07-07 00:00:00",
};

describe("formatEventDate", () => {
  it("formats Russian dates in genitive", () => {
    expect(formatEventDate("2026-09-12", "ru")).toBe("12 сентября 2026");
  });
  it("formats Kyrgyz dates in the invitation style", () => {
    expect(formatEventDate("2026-09-12", "ky")).toBe("12-сентябрь, 2026-жыл");
  });
});

describe("displayNames", () => {
  it("joins couple names with the locale conjunction", () => {
    expect(displayNames(base, "ky")).toBe("Азамат жана Айпери");
    expect(displayNames(base, "ru")).toBe("Азамат и Айпери");
  });
  it("shows a single honoree when no partner", () => {
    expect(displayNames({ ...base, partner: null }, "ru")).toBe("Азамат");
    expect(displayNames({ ...base, partner: "  " }, "ru")).toBe("Азамат");
  });
});

describe("eventLabel / inviteTitle", () => {
  it("localizes the event label", () => {
    expect(eventLabel(base, "ru")).toBe("Свадьба");
    expect(eventLabel(base, "ky")).toBe("Үйлөнүү тою");
  });
  it("builds a title with label and names", () => {
    expect(inviteTitle(base, "ru")).toBe("Свадьба · Азамат и Айпери");
  });
});
