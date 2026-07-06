import type { Locale, TemplateKey } from "./types";

export interface TemplateConfig {
  key: TemplateKey;
  names: Record<Locale, string>;
  /** CSS custom-property values applied to the invite page. */
  palette: {
    /** Warm celebratory background base. */
    bg: string;
    /** Deep ink used for text. */
    ink: string;
    /** The single celebratory accent. */
    accent: string;
    /** Softer accent tint for fills/borders. */
    accentSoft: string;
    /** Muted secondary text. */
    muted: string;
    /** Card surface over the background. */
    surface: string;
  };
  /** Static per-template OG image, served from /og/<key>.png. */
  ogImage: string;
  /** Decorative hero background, served from /templates/<key>.png. */
  heroImage: string;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    key: "gold",
    names: { ru: "Золото", ky: "Алтын" },
    palette: {
      bg: "#fbf5e9",
      ink: "#2a2016",
      accent: "#b8860b",
      accentSoft: "#e9d9a8",
      muted: "#7a6a4f",
      surface: "#fffdf7",
    },
    ogImage: "/og/gold.jpg",
    heroImage: "/templates/gold.jpg",
  },
  {
    key: "emerald",
    names: { ru: "Изумруд", ky: "Зумурат" },
    palette: {
      bg: "#eef5f0",
      ink: "#14261d",
      accent: "#1f7a54",
      accentSoft: "#bfe0cf",
      muted: "#4f6b5d",
      surface: "#fbfefc",
    },
    ogImage: "/og/emerald.jpg",
    heroImage: "/templates/emerald.jpg",
  },
  {
    key: "rose",
    names: { ru: "Роза", ky: "Кызгылт" },
    palette: {
      bg: "#fdf0f0",
      ink: "#2c1720",
      accent: "#c04664",
      accentSoft: "#f4cdd6",
      muted: "#8a5c68",
      surface: "#fffafb",
    },
    ogImage: "/og/rose.jpg",
    heroImage: "/templates/rose.jpg",
  },
];

const BY_KEY = new Map(TEMPLATES.map((tpl) => [tpl.key, tpl]));

export const TEMPLATE_KEYS: TemplateKey[] = TEMPLATES.map((tpl) => tpl.key);

export function isTemplate(v: unknown): v is TemplateKey {
  return typeof v === "string" && BY_KEY.has(v as TemplateKey);
}

export function getTemplate(key: TemplateKey): TemplateConfig {
  const tpl = BY_KEY.get(key);
  if (!tpl) throw new Error(`unknown template: ${key}`);
  return tpl;
}
