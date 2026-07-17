import type { Locale } from "./types";

/** Russian cardinal plural: 1 день / 2 дня / 5 дней (handles 11–14). */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export type CountdownUnit = "day" | "hour" | "minute";

const RU_FORMS: Record<CountdownUnit, [string, string, string]> = {
  day: ["день", "дня", "дней"],
  hour: ["час", "часа", "часов"],
  minute: ["минута", "минуты", "минут"],
};

// Kyrgyz nouns don't inflect after numerals.
const KY_FORMS: Record<CountdownUnit, string> = {
  day: "күн",
  hour: "саат",
  minute: "мүнөт",
};

export function countdownUnitLabel(locale: Locale, unit: CountdownUnit, n: number): string {
  if (locale === "ky") return KY_FORMS[unit];
  const [one, few, many] = RU_FORMS[unit];
  return ruPlural(n, one, few, many);
}
