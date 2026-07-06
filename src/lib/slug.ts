import { randomBytes } from "node:crypto";

// URL-safe, unambiguous alphabet: no 0/O/1/l/I to keep hand-shared links robust.
const SLUG_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const TOKEN_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export const SLUG_LENGTH = 8;
export const TOKEN_LENGTH = 24;

/**
 * Map raw bytes onto an alphabet. Pure — the RNG is injected as `bytes`, so the
 * mapping is deterministically testable. Uses rejection-free modulo; the tiny
 * bias is irrelevant for non-cryptographic slug identifiers.
 */
export function encodeFromBytes(bytes: Uint8Array, alphabet: string): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function generateSlug(length: number = SLUG_LENGTH): string {
  return encodeFromBytes(randomBytes(length), SLUG_ALPHABET);
}

export function generateToken(length: number = TOKEN_LENGTH): string {
  return encodeFromBytes(randomBytes(length), TOKEN_ALPHABET);
}

const SLUG_RE = new RegExp(`^[${SLUG_ALPHABET}]+$`);

/** Validate a slug taken from a URL before it touches the database. */
export function isValidSlug(v: unknown): v is string {
  return typeof v === "string" && v.length >= 4 && v.length <= 32 && SLUG_RE.test(v);
}
