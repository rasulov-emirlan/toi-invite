import "server-only";
import { headers } from "next/headers";
import { logEvent } from "./db";
import { ipFromHeaders, trackLimiter } from "./ratelimit";

/**
 * Link-preview crawlers (WhatsApp/Telegram fetch every shared URL) and plain
 * scripts must not count as product usage or grow the events table. Real users
 * open invites in Chrome/WebView UAs, which none of these match.
 */
const BOT_UA_RE =
  /bot|crawler|spider|preview|whatsapp|telegram|facebookexternalhit|twitterbot|slackbot|viber|skypeuripreview|linkedin|vkshare|curl|wget|python|go-http|okhttp|headless/i;

/**
 * Server-component page-view logging: skips crawlers, and rides the track
 * limiter so an unauthenticated curl loop can't grow the events table at
 * request rate. Analytics stay best-effort — never throws.
 */
export async function logPageView(
  name: string,
  slug: string | null = null,
  ref: string | null = null,
): Promise<void> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (BOT_UA_RE.test(ua)) return;
    if (!trackLimiter.check(`pv:${ipFromHeaders(h)}`, Date.now()).allowed) return;
    logEvent(name, slug, ref);
  } catch (err) {
    console.error("logPageView failed", err);
  }
}
