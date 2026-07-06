import type { EventTypeKey, Locale } from "./types";

export interface EventTypeConfig {
  key: EventTypeKey;
  /** Public-facing name of the celebration, per locale. */
  labels: Record<Locale, string>;
  /** Short descriptor shown in the builder dropdown, per locale. */
  hints: Record<Locale, string>;
  /** Whether a second honoree (partner) name is typical for this event. */
  hasPartner: boolean;
  /** A warm default greeting the organizer can keep or edit, per locale. */
  defaultGreeting: Record<Locale, string>;
}

export const EVENT_TYPES: EventTypeConfig[] = [
  {
    key: "wedding",
    labels: { ru: "Свадьба", ky: "Үйлөнүү тою" },
    hints: { ru: "Никах / свадебный той", ky: "Нике / үйлөнүү тою" },
    hasPartner: true,
    defaultGreeting: {
      ru: "Дорогие родные и друзья! Приглашаем вас разделить с нами радость нашего дня.",
      ky: "Кымбаттуу туугандар жана достор! Бул кубанычтуу күнүбүздү биз менен бөлүшүүгө чакырабыз.",
    },
  },
  {
    key: "kyz_uzatuu",
    labels: { ru: "Кыз узатуу", ky: "Кыз узатуу" },
    hints: { ru: "Проводы невесты", ky: "Кызды узатуу тою" },
    hasPartner: false,
    defaultGreeting: {
      ru: "Приглашаем вас на кыз узатуу — проводить нашу дочь в добрый путь.",
      ky: "Кызыбызды ак жолго узатууга — кыз узатуу тоюна чакырабыз.",
    },
  },
  {
    key: "sunnet_toi",
    labels: { ru: "Сүннөт той", ky: "Сүннөт той" },
    hints: { ru: "Праздник обрезания", ky: "Сүннөткө отургузуу тою" },
    hasPartner: false,
    defaultGreeting: {
      ru: "Приглашаем вас на сүннөт той нашего сына. Будем рады видеть вас!",
      ky: "Уулубуздун сүннөт тоюна чакырабыз. Сиздерди көрүүгө кубанычтабыз!",
    },
  },
  {
    key: "beshik_toi",
    labels: { ru: "Бешик той", ky: "Бешик той" },
    hints: { ru: "Укладывание в колыбель", ky: "Наристени бешикке салуу тою" },
    hasPartner: false,
    defaultGreeting: {
      ru: "С радостью приглашаем вас на бешик той нашего малыша.",
      ky: "Наристебиздин бешик тоюна чоң кубаныч менен чакырабыз.",
    },
  },
  {
    key: "jubilee",
    labels: { ru: "Юбилей", ky: "Юбилей" },
    hints: { ru: "Мерей той / круглая дата", ky: "Мерей той / майрамдык жаш" },
    hasPartner: false,
    defaultGreeting: {
      ru: "Приглашаем вас разделить с нами этот особенный юбилей.",
      ky: "Бул өзгөчө мерей тойду биз менен бөлүшүүгө чакырабыз.",
    },
  },
];

const BY_KEY = new Map(EVENT_TYPES.map((e) => [e.key, e]));

export const EVENT_TYPE_KEYS: EventTypeKey[] = EVENT_TYPES.map((e) => e.key);

export function isEventType(v: unknown): v is EventTypeKey {
  return typeof v === "string" && BY_KEY.has(v as EventTypeKey);
}

export function getEventType(key: EventTypeKey): EventTypeConfig {
  const cfg = BY_KEY.get(key);
  if (!cfg) throw new Error(`unknown event type: ${key}`);
  return cfg;
}
