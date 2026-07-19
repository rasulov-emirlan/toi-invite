import type { Locale, TemplateKey } from "./types";

/** Visual composition family: classic frames vs Kyrgyz-ornament (oimo) plates. */
export type TemplateLayout = "classic" | "ornament";

export interface TemplateConfig {
  key: TemplateKey;
  layout: TemplateLayout;
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
  /** Decorative hero background, served from /templates/<key>.png. */
  heroImage: string;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    key: "gold",
    layout: "classic",
    names: { ru: "Золото", ky: "Алтын" },
    palette: {
      bg: "#fbf5e9",
      ink: "#2a2016",
      // Dark enough for 4.5:1 on the card surface — the accent is also small text.
      accent: "#8a6508",
      accentSoft: "#e9d9a8",
      muted: "#7a6a4f",
      surface: "#fffdf7",
    },
    heroImage: "/templates/gold.jpg",
  },
  {
    key: "emerald",
    layout: "classic",
    names: { ru: "Изумруд", ky: "Зумурат" },
    palette: {
      bg: "#eef5f0",
      ink: "#14261d",
      accent: "#1f7a54",
      accentSoft: "#bfe0cf",
      muted: "#4f6b5d",
      surface: "#fbfefc",
    },
    heroImage: "/templates/emerald.jpg",
  },
  {
    key: "rose",
    layout: "classic",
    names: { ru: "Роза", ky: "Кызгылт" },
    palette: {
      bg: "#fdf0f0",
      ink: "#2c1720",
      accent: "#a83a55",
      accentSoft: "#f4cdd6",
      muted: "#8a5c68",
      surface: "#fffafb",
    },
    heroImage: "/templates/rose.jpg",
  },
  // Kyrgyz-ornament (oimo/shyrdak) plates — kochkor-muyuz spirals, same three
  // palettes as the classic frames so the invite chrome colors carry over.
  {
    key: "ornament_gold",
    layout: "ornament",
    names: { ru: "Оймо · золото", ky: "Оймо · алтын" },
    palette: {
      bg: "#fbf5e9",
      ink: "#2a2016",
      accent: "#8a6508",
      accentSoft: "#e9d9a8",
      muted: "#7a6a4f",
      surface: "#fffdf7",
    },
    heroImage: "/templates/ornament_gold.jpg",
  },
  {
    key: "ornament_emerald",
    layout: "ornament",
    names: { ru: "Оймо · изумруд", ky: "Оймо · зумурат" },
    palette: {
      bg: "#eef5f0",
      ink: "#14261d",
      accent: "#1f7a54",
      accentSoft: "#bfe0cf",
      muted: "#4f6b5d",
      surface: "#fbfefc",
    },
    heroImage: "/templates/ornament_emerald.jpg",
  },
  {
    key: "ornament_rose",
    layout: "ornament",
    names: { ru: "Оймо · роза", ky: "Оймо · кызгылт" },
    palette: {
      bg: "#fdf0f0",
      ink: "#2c1720",
      accent: "#a83a55",
      accentSoft: "#f4cdd6",
      muted: "#8a5c68",
      surface: "#fffafb",
    },
    heroImage: "/templates/ornament_rose.jpg",
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

/** The template palette as the CSS custom properties the invite styles read. */
export function paletteVars(tpl: TemplateConfig): Record<string, string> {
  return {
    "--ac": tpl.palette.accent,
    "--soft": tpl.palette.accentSoft,
    "--tbg": tpl.palette.bg,
    "--tink": tpl.palette.ink,
    "--tmuted": tpl.palette.muted,
    "--tsurface": tpl.palette.surface,
  };
}
