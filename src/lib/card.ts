/**
 * Downloadable invite-card formats. The dominant KG invite format is a JPG
 * forwarded in a family WhatsApp group — «story» is that image (9:16, phone
 * screen); «print» is an A5 portrait at 300 dpi for the elders' printed copy.
 * Both carry a QR to the RSVP link so a forwarded/printed image still converts.
 */
export type CardFormat = "story" | "print";

export function isCardFormat(v: unknown): v is CardFormat {
  return v === "story" || v === "print";
}

export const CARD_DIMENSIONS: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  // A5 (148×210 mm) at 300 dpi.
  print: { width: 1748, height: 2480 },
};

/**
 * Typography scale factor for a format, relative to the 1080-wide story
 * layout. The two formats share one flex layout; only sizes scale.
 */
export function cardScale(format: CardFormat): number {
  return CARD_DIMENSIONS[format].width / CARD_DIMENSIONS.story.width;
}

/** Download filename — ASCII-safe (goes into Content-Disposition verbatim). */
export function cardFilename(slug: string, format: CardFormat): string {
  return `toi-${slug}-${format === "print" ? "a5" : "story"}.jpg`;
}
