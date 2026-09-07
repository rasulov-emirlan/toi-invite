import { isLocale } from "./i18n";
import { normalizeKgPhone } from "./phone";
import type { ValidationResult } from "./validation";
import type { Locale, PremiumInterestInput, PremiumTierKey } from "./types";

/**
 * Premium tiers for the interest fake-door. No real payment runs here — the
 * order form captures *intent* (name + WhatsApp number + which tier) so we can
 * measure willingness-to-pay before wiring mbank/FreedomPay. Prices are the
 * ones quoted to prospects; `orderable` gates which tiers the form accepts (the
 * free tier is not an order).
 */
/**
 * The unlockable capabilities, named after the outcome the buyer wants rather
 * than the code that implements it.
 */
export interface TierEntitlements {
  /** Story card and video render without the «Той-Invite» stamp. */
  cleanMedia: boolean;
  /** The A5 300dpi file a printer will take. */
  printExport: boolean;
  /** The invite page itself drops our wordmark. */
  cleanSite: boolean;
  /** Guest phone numbers and one-tap `wa.me/<number>` sends on the board. */
  directSend: boolean;
  /** We fill the invite in for them over WhatsApp. */
  concierge: boolean;
}

const NOTHING: TierEntitlements = {
  cleanMedia: false,
  printExport: false,
  cleanSite: false,
  directSend: false,
  concierge: false,
};

export interface PremiumTier {
  key: PremiumTierKey;
  /** Price in KGS for one toi. 0 for the free tier. */
  priceSom: number;
  /** Free tier is shown for context but cannot be "ordered". */
  orderable: boolean;
  /** Real Finik checkout allowed — only for tiers whose promises the product
   *  delivers today. The rest stay lead-capture until their features ship. */
  payable: boolean;
  /** Highlighted as the recommended tier. */
  popular: boolean;
  /** Kept in the config but not shown: a tier whose promises the product
   *  doesn't keep yet sells worse than a shorter menu, and deleting the key
   *  outright would break `getTier` for any row that already stores it. */
  hidden?: boolean;
  /** What this tier actually unlocks. The ladder lives here rather than in
   *  scattered `invite.premium_tier !== null` checks — those could only ever
   *  express "paid / not paid", which is one rung. */
  entitlements: TierEntitlements;
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
    payable: false,
    popular: false,
    entitlements: NOTHING,
    names: { ru: "Бесплатный", ky: "Акысыз" },
    tagline: { ru: "Всё для одного тоя", ky: "Бир той үчүн баары" },
    features: {
      ru: [
        "Сайт-приглашение и 6 дизайнов",
        "Учёт гостей и пожелания (RSVP)",
        "Именные ссылки для каждого гостя",
        "Открытка для WhatsApp (с QR)",
        "Видео-приглашение для WhatsApp",
        "Список подарков и реквизиты для поздравлений",
        "Экспорт списка для тамады (CSV)",
      ],
      ky: [
        "Чакыруу-сайт жана 6 дизайн",
        "Меймандарды эсептөө жана каалоо-тилектер (RSVP)",
        "Ар бир мейманга аты жазылган шилтеме",
        "WhatsApp үчүн открытка (QR менен)",
        "WhatsApp үчүн видео-чакыруу",
        "Белектер тизмеси жана куттуктоо реквизиттери",
        "Тамада үчүн тизме экспорту (CSV)",
      ],
    },
  },
  {
    // The finished files, at the price KG families are actually seen asking
    // for a custom digital invitation on lalafo (200-500 сом).
    key: "premium",
    priceSom: 490,
    orderable: true,
    payable: true,
    popular: false,
    entitlements: {
      ...NOTHING,
      cleanMedia: true,
      printExport: true,
    },
    names: { ru: "Медиа-пакет", ky: "Медиа-топтом" },
    tagline: {
      ru: "Готовые файлы без водяного знака",
      ky: "Суу белгисиз даяр файлдар",
    },
    features: {
      ru: [
        "Всё из бесплатного",
        "Видео-приглашение без водяного знака",
        "Открытка для WhatsApp без водяного знака",
        "Файл для типографии: A5, 300 dpi",
      ],
      ky: [
        "Акысыздын баары",
        "Суу белгисиз видео-чакыруу",
        "WhatsApp үчүн суу белгисиз открытка",
        "Басмакана үчүн файл: A5, 300 dpi",
      ],
    },
  },
  {
    // The labour saver. 490 sells finished files; this sells back the evening
    // an organizer would otherwise spend finding 150 people in their contacts.
    key: "pro",
    priceSom: 990,
    orderable: true,
    payable: true,
    popular: true,
    entitlements: {
      cleanMedia: true,
      printExport: true,
      cleanSite: true,
      directSend: true,
      concierge: false,
    },
    names: { ru: "Той под контролем", ky: "Той көзөмөлдө" },
    tagline: {
      ru: "Когда гостей больше сотни",
      ky: "Меймандар жүздөн ашканда",
    },
    features: {
      ru: [
        "Всё из Медиа-пакета",
        "Каждому гостю — личное сообщение в WhatsApp в один тап",
        "Список гостей: кто получил, кто открыл, кто ответил",
        "Без надписи «Той-Invite» на самом приглашении",
        "Приоритетная помощь в WhatsApp",
      ],
      ky: [
        "Медиа-топтомдун баары",
        "Ар бир мейманга WhatsApp'та бир басууда жеке кабар",
        "Меймандар тизмеси: ким алды, ким ачты, ким жооп берди",
        "Чакыруунун өзүндө «Той-Invite» жазуусу жок",
        "WhatsApp'та биринчи кезекте жардам",
      ],
    },
  },
  {
    // The lalafo alternative is hand-made and full-service — this tier tests
    // whether "we do it for you" (not templates) is what KG families pay for.
    key: "concierge",
    priceSom: 1990,
    orderable: true,
    payable: false,
    popular: false,
    entitlements: {
      cleanMedia: true,
      printExport: true,
      cleanSite: true,
      directSend: true,
      concierge: true,
    },
    names: { ru: "Под ключ", ky: "Даяр чечим" },
    tagline: {
      ru: "Пришлите данные в WhatsApp — сделаем за вас",
      ky: "WhatsApp'ка маалымат жөнөтүңүз — өзүбүз жасайбыз",
    },
    features: {
      ru: [
        "Всё из «Той под контролем»",
        "Заполним и оформим за вас",
        "Готово в течение 2 часов",
        "Правки до самого тоя",
      ],
      ky: [
        "«Той көзөмөлдө» баары",
        "Баарын өзүбүз толтуруп, кооздойбуз",
        "2 сааттын ичинде даяр",
        "Тойго чейин оңдоолор",
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

/** The tiers a visitor should actually see. */
export const VISIBLE_TIERS: PremiumTier[] = PREMIUM_TIERS.filter((t) => !t.hidden);

/**
 * What an invite's stored tier unlocks. Total over anything the column might
 * hold — null, a legacy key, a typo — because a render path must never throw
 * on the way to deciding whether to draw a watermark.
 */
export function entitlementsFor(tier: string | null | undefined): TierEntitlements {
  if (!tier) return NOTHING;
  return BY_KEY.get(tier as PremiumTierKey)?.entitlements ?? NOTHING;
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

// Re-exported so the premium surfaces keep one import for "a KG phone number".
export { normalizeKgPhone };
