/**
 * Anonymous visitor id. Counting events tells you how much happened; counting
 * *distinct visitors* per funnel step is the only way to get a conversion
 * rate, which is the number every product decision here turns on.
 *
 * Deliberately not an identity: 16 random bytes in a first-party HttpOnly
 * cookie, no IP, no user-agent, no PII, and it rides the same 90-day retention
 * window as the events table it annotates.
 *
 * Web Crypto rather than node:crypto — this module is imported by the
 * middleware, which runs on the Edge runtime where node:crypto is absent.
 */
export const SID_COOKIE = "toi_sid";

/** Request header the middleware uses to hand a freshly-minted sid to the
 *  server components of the very same response (a Set-Cookie is not readable
 *  via cookies() until the browser sends it back on the next request). */
export const SID_HEADER = "x-toi-sid";

/** 16 bytes, base64url — 22 chars, no padding. */
const SID_RE = /^[A-Za-z0-9_-]{22}$/;

export function newSid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isSid(value: unknown): value is string {
  return typeof value === "string" && SID_RE.test(value);
}

/** The sid to attribute an event to, or null when the value isn't one of ours. */
export function normalizeSid(value: string | null | undefined): string | null {
  return isSid(value) ? value : null;
}

/**
 * The sid from a request's own Cookie header. API routes are excluded from the
 * middleware matcher, so they read the cookie the browser already carries
 * rather than the forwarded header.
 */
export function sidFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== SID_COOKIE) continue;
    return normalizeSid(part.slice(eq + 1).trim());
  }
  return null;
}

/** The sid attached to an incoming API request, or null. */
export function sidFromRequest(req: Request): string | null {
  return sidFromCookieHeader(req.headers.get("cookie"));
}
