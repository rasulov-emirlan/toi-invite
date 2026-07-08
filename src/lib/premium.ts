import { isLocale } from "./i18n";
import type { ValidationResult } from "./validation";
import type { Locale, PremiumInterestInput, PremiumTierKey } from "./types";

/**
 * Premium tiers for the interest fake-door. No real payment runs here — the
 * order form captures *intent* (name + WhatsApp number + which tier) so we can
 * measure willingness-to-pay before wiring mbank/FreedomPay. Prices are the
 * ones quoted to prospects; `orderable` gates which tiers the form accepts (the
 * free tier is not an order).
 */
export interface PremiumTier {
  key: PremiumTierKey;
  /** Price in KGS for one toi. 0 for the free tier. */
  priceSom: number;
  /** Free tier is shown for context but cannot be "ordered". */
  orderable: boolean;
  /** Highlighted as the recommended tier. */
  popular: boolean;
  names: Record<Locale, string>;
  tagline: Record<Locale, string>;
  /** Feature bullets, per locale. Equal length across locales (enforced by test). */
  features: Record<Locale, string[]>;
}

export const PREMIUM_TIERS: PremiumTier[] = [
  {
    key: "free",
    priceSom: 0,
    orderable: false,
    popular: false,
    names: { ru: "Бесплатный", ky: "Акысыз" },
    tagline: { ru: "Всё для одного тоя", ky: "Бир той үчүн баары" },
    features: {
      ru: [
        "1 приглашение",
        "3 праздничных шаблона",
        "Учёт гостей (RSVP)",
        "Ссылка красиво раскрывается в WhatsApp",
      ],
      ky: [
        "1 чакыруу",
        "3 майрамдык үлгү",
        "Меймандарды эсептөө (RSVP)",
        "Шилтеме WhatsApp'та кооз ачылат",
      ],
    },
  },
  {
    key: "premium",
    priceSom: 990,
    orderable: true,
    popular: true,
    names: { ru: "Премиум", ky: "Премиум" },
    tagline: {
      ru: "Для тех, кто хочет вау-эффект",
      ky: "Вау-эффект каалагандар үчүн",
    },
    features: {
      ru: [
        "Всё из бесплатного",
        "Именные ссылки для каждого гостя",
        "Премиум-шаблоны",
        "Без надписи «Той-Invite»",
        "Приоритетная помощь в WhatsApp",
      ],
      ky: [
        "Акысыздын баары",
        "Ар бир мейманга аты жазылган шилтеме",
        "Премиум үлгүлөр",
        "«Той-Invite» жазуусуз",
        "WhatsApp'та тез жардам",
      ],
    },
  },
  {
    key: "pro",
    priceSom: 1490,
    orderable: true,
    popular: false,
    names: { ru: "Про", ky: "Про" },
    tagline: {
      ru: "Для тамады и больших тоев",
      ky: "Тамада жана чоң тойлор үчүн",
    },
    features: {
      ru: [
        "Всё из Премиум",
        "Фотоальбом тоя",
        "Несколько событий в одной ссылке",
        "Экспорт списка для тамады и кафе (CSV)",
        "Свой логотип и цвета",
      ],
      ky: [
        "Премиумдун баары",
        "Той фотоальбому",
        "Бир шилтемеде бир нече иш-чара",
        "Тамада жана кафе үчүн экспорт (CSV)",
        "Өз логотипиңиз жана түстөрүңүз",
      ],
    },
  },
];

const BY_KEY = new Map(PREMIUM_TIERS.map((t) => [t.key, t]));
const ORDERABLE = new Set(
  PREMIUM_TIERS.filter((t) => t.orderable).map((t) => t.key),
);

export function getTier(key: PremiumTierKey): PremiumTier {
  const cfg = BY_KEY.get(key);
  if (!cfg) throw new Error(`unknown premium tier: ${key}`);
  return cfg;
}

export function isOrderableTier(v: unknown): v is PremiumTierKey {
  return typeof v === "string" && ORDERABLE.has(v as PremiumTierKey);
}

/**
 * Format a som amount with a no-break-space thousands separator ("1 490"),
 * deterministically. We avoid `Number.toLocaleString` on purpose: its ICU
 * separator can differ between the Node server (U+00A0) and the browser
 * (U+202F), which would cause a React hydration mismatch on the price text.
 */
export function formatSom(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export const PREMIUM_LIMITS = { name: 80, comment: 400 } as const;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Normalize a Kyrgyz phone number to canonical `+996XXXXXXXXX`, or null if it
 * cannot be a KG number. Accepts the forms people actually type:
 * `+996 555 12 34 56`, `996555123456`, `0555 123456`, `555123456` — spaces,
 * dashes and parens are ignored. The 9-digit national part must start 2–9
 * (no KG operator/area code begins with 0 or 1), which rejects obvious junk
 * like `000000000` without rejecting any real number.
 */
export function normalizeKgPhone(raw: string): string | null {
  const digits = raw.replace(/\D+/g, "");
  let national: string;
  if (digits.length === 12 && digits.startsWith("996")) national = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("0")) national = digits.slice(1);
  else if (digits.length === 9) national = digits;
  else return null;
  if (!/^[2-9]\d{8}$/.test(national)) return null;
  return `+996${national}`;
}

export interface CleanPremiumInterest {
  tier: PremiumTierKey;
  name: string;
  phone: string;
  locale: Locale;
  comment: string | null;
}

export function validatePremiumInterest(
  input: PremiumInterestInput,
): ValidationResult<CleanPremiumInterest> {
  // A JSON body of literal `null` (or a primitive/array) parses fine but is not
  // a usable input — guard before we read fields so the endpoint returns a clean
  // 400 instead of throwing a 500 on `input.tier`.
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["body"] };
  }

  const errors: string[] = [];

  if (!isOrderableTier(input.tier)) errors.push("tier");

  const name = str(input.name);
  if (name.length < 1 || name.length > PREMIUM_LIMITS.name) errors.push("name");

  const phone = normalizeKgPhone(str(input.phone));
  if (!phone) errors.push("phone");

  if (!isLocale(input.locale)) errors.push("locale");

  const commentRaw = str(input.comment);
  if (commentRaw.length > PREMIUM_LIMITS.comment) errors.push("comment");
  const comment = commentRaw.length > 0 ? commentRaw : null;

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      tier: input.tier as PremiumTierKey,
      name,
      phone: phone as string,
      locale: input.locale as Locale,
      comment,
    },
  };
}
