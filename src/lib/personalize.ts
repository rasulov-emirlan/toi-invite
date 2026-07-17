export const MAX_GUEST_NAME = 60;

/**
 * Sanitize a guest name that arrives from the `?to=` URL param (or the organizer's
 * link generator). Whitelist approach: keep letters (incl. Cyrillic), combining
 * marks, numbers, spaces and a few name punctuation marks (' . -); replace
 * everything else (control chars, angle brackets, &, quotes, …) with a space,
 * collapse whitespace, and cap the length. Display is already React-escaped —
 * this is belt-and-suspenders plus tidy formatting. Returns "" when nothing
 * usable remains.
 */
export function sanitizeGuestName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const cleaned = raw
    .replace(/[^\p{L}\p{M}\p{N} '.\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Slice by CODE POINT, not UTF-16 unit: a code-unit slice can split an astral
  // pair and leave a lone surrogate, which makes encodeURIComponent() throw and
  // 500s the invite page. Array.from iterates by code point.
  return Array.from(cleaned).slice(0, MAX_GUEST_NAME).join("");
}

/**
 * Case-insensitive identity key for a guest name, used to fold repeat RSVPs from
 * the same guest into one row. JS-side because SQLite's lower() is ASCII-only
 * and most guest names are Cyrillic.
 */
export function guestNameKey(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Build a per-guest personalized invite link. `origin` is the public origin
 * (e.g. https://toi.night.enkiduck.com). Falls back to the plain invite URL when
 * the name is empty after sanitization.
 */
export function personalLink(origin: string, slug: string, name: string): string {
  const base = `${origin}/i/${slug}`;
  const clean = sanitizeGuestName(name);
  return clean ? `${base}?to=${encodeURIComponent(clean)}` : base;
}
