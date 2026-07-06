import { timingSafeEqual } from "node:crypto";

/**
 * Length-safe, constant-time token comparison for the organizer gate. Avoids the
 * early-exit timing signal of `===` (harmless for a 138-bit token behind a DB
 * round-trip, but correct hygiene). Server-only — imports node:crypto.
 */
export function tokensMatch(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
