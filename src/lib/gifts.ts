import type { GiftRecord, GuestGift } from "./types";

export const GIFT_LIMITS = { title: 120, perInvite: 50 } as const;

/** Trimmed title or null when unusable. */
export function cleanGiftTitle(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (t.length < 1 || t.length > GIFT_LIMITS.title) return null;
  return t;
}

/**
 * Project gift rows to what a guest may see. The claim ref is a capability
 * (whoever holds it can release the reservation) and the claimer's name is
 * organizer-only — neither ever leaves the server.
 */
export function toGuestGifts(rows: GiftRecord[], guestRef: string | null): GuestGift[] {
  return rows.map((g) => ({
    id: g.id,
    title: g.title,
    taken: g.claimed_ref !== null,
    yours: guestRef !== null && g.claimed_ref === guestRef,
  }));
}
