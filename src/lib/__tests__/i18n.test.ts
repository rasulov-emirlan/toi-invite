import { describe, expect, it } from "vitest";
import { LOCALES, STRINGS, t } from "../i18n";
import { EVENT_TYPES } from "../events";
import { TEMPLATES } from "../templates";

describe("i18n locale parity", () => {
  it("defines exactly the same keys in every locale", () => {
    const ruKeys = Object.keys(STRINGS.ru).sort();
    const kyKeys = Object.keys(STRINGS.ky).sort();
    expect(kyKeys).toEqual(ruKeys);
  });

  it("has a non-empty string for every key in every locale", () => {
    for (const loc of LOCALES) {
      for (const [key, val] of Object.entries(STRINGS[loc])) {
        expect(typeof val, `${loc}.${key}`).toBe("string");
        expect(val.trim().length, `${loc}.${key} non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it("t() returns the right locale's value", () => {
    expect(t("ru", "landing.cta")).toBe("Создать приглашение");
    expect(t("ky", "landing.cta")).toBe("Чакыруу түзүү");
  });
});

describe("event type config completeness", () => {
  it("provides labels, hints and default greetings in both locales", () => {
    for (const ev of EVENT_TYPES) {
      for (const loc of LOCALES) {
        expect(ev.labels[loc]?.trim().length, `${ev.key} label ${loc}`).toBeGreaterThan(0);
        expect(ev.hints[loc]?.trim().length, `${ev.key} hint ${loc}`).toBeGreaterThan(0);
        expect(
          ev.defaultGreeting[loc]?.trim().length,
          `${ev.key} greeting ${loc}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("has unique event keys", () => {
    const keys = EVENT_TYPES.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("template config completeness", () => {
  it("provides names in both locales plus og and hero images", () => {
    for (const tpl of TEMPLATES) {
      for (const loc of LOCALES) {
        expect(tpl.names[loc]?.trim().length, `${tpl.key} name ${loc}`).toBeGreaterThan(0);
      }
      expect(tpl.ogImage).toMatch(/^\/og\/.+\.(png|jpe?g)$/);
      expect(tpl.heroImage).toMatch(/^\/templates\/.+\.(png|jpe?g)$/);
      for (const c of Object.values(tpl.palette)) {
        expect(c, `${tpl.key} palette color`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("has unique template keys", () => {
    const keys = TEMPLATES.map((tpl) => tpl.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
