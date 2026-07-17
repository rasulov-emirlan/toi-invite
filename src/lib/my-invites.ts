/**
 * Browser-local "my invites" list — the organizer token's only home besides the
 * success-panel link, so losing that link no longer orphans the invite.
 * localStorage-only (this runs in client components); every access is guarded
 * because WhatsApp/incognito WebViews can throw on storage.
 */

export interface MyInvite {
  slug: string;
  token: string;
  /** Display line, e.g. "Свадьба · Азамат и Айпери". */
  title: string;
  createdAt: string; // ISO
}

const KEY = "toi.my-invites";
const MAX = 20;

export function listMyInvites(): MyInvite[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is MyInvite =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as MyInvite).slug === "string" &&
        typeof (x as MyInvite).token === "string" &&
        typeof (x as MyInvite).title === "string",
    );
  } catch {
    return [];
  }
}

export function rememberInvite(entry: MyInvite): void {
  try {
    const rest = listMyInvites().filter((x) => x.slug !== entry.slug);
    const next = [entry, ...rest].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the success panel still shows the links */
  }
}
