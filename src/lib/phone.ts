/**
 * Kyrgyz phone numbers. Lives on its own because two very different surfaces
 * need it: the premium order form (one number, typed) and the guest board
 * (a hundred numbers, pasted out of someone's Notes app next to the names).
 */

/**
 * Any of the ways a KG number gets written — `+996555123456`, `996555123456`,
 * `0555 123 456`, `555123456` — normalized to E.164, or null if it isn't one.
 * Operator codes never start 0 or 1, which is what rejects a mistyped landline.
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

/** `+996555123456` → `0555 12 34 56` — how a KG organizer reads it back. */
export function formatKgPhone(e164: string): string {
  const m = /^\+996(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  if (!m) return e164;
  return `0${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

/** wa.me wants bare digits, no plus. */
export function whatsappDigits(e164: string): string {
  return e164.replace(/\D+/g, "");
}

export interface ParsedGuestLine {
  name: string;
  phone: string | null;
}

/**
 * One pasted line → a guest. Organizers keep their toi list as "Name, number"
 * in Notes or a WhatsApp message to themselves, in every separator style there
 * is ("Айбек аке — 0555 12 34 56", "Гүлнара +996700111222", "Нурбек, 0700111222").
 *
 * The number is taken only from the END of the line: a run of digits in the
 * middle is part of the name as written ("Дом 5, Айбек"), and guessing there
 * would silently text the wrong person.
 */
export function parseGuestLine(line: string): ParsedGuestLine {
  const trimmed = line.trim();
  // A trailing phone-shaped run: optional + or opening paren, then digits with
  // spaces/dashes/parens between them. Anchored to the end, minimum 9 digits.
  const m = /^(.*?)[\s,;:—–(-]*(\+?[\d][\d\s()\-.]{7,}\d)$/.exec(trimmed);
  if (!m) return { name: trimmed, phone: null };
  const phone = normalizeKgPhone(m[2]);
  // Not a valid KG number after all — keep the line intact as a name rather
  // than truncating it.
  if (!phone) return { name: trimmed, phone: null };
  const name = m[1].trim().replace(/[\s,;:—–(-]+$/, "");
  // "0555123456" on its own is a number with no name — nothing to address.
  if (!name) return { name: trimmed, phone: null };
  return { name, phone };
}
