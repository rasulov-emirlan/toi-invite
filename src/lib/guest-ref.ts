/**
 * Stable anonymous id for this browser, sent with RSVPs so a guest's repeat
 * submission updates their earlier answer instead of double-counting. Returns
 * null when storage is unavailable (private WebViews) — the RSVP then simply
 * inserts a new row.
 */
export function getGuestRef(): string | null {
  const KEY = "toi.guest-ref";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}
