import { NextResponse } from "next/server";
import { getInvite, logEvent, markInvitedGuestOpened } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { GUEST_LINK_TOKEN_RE } from "@/lib/validation";
import { clientIp, trackLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Client-side product events we accept — anything else is dropped. */
const TRACKABLE = new Set(["share_click", "create_own_click", "calendar_click"]);

export async function POST(req: Request) {
  const rl = trackLimiter.check(`track:${clientIp(req)}`, Date.now());
  // Beacons are best-effort: a rate-limited beacon still returns 204 so the
  // client never retries or surfaces an error for analytics.
  if (rl.allowed) {
    try {
      const body = (await req.json()) as { name?: unknown; slug?: unknown; g?: unknown };
      const name = typeof body?.name === "string" ? body.name : "";
      const slugRaw = isValidSlug(body?.slug) ? (body.slug as string) : null;
      // Only reference real invites — otherwise the events table becomes an
      // arbitrary-string sink for anyone with curl.
      const slug = slugRaw && getInvite(slugRaw) ? slugRaw : null;
      if (TRACKABLE.has(name)) {
        logEvent(name, slug);
      } else if (name === "guest_open" && slug) {
        // Personal-link "opened" stamp — capability-token gated, idempotent.
        const g = typeof body?.g === "string" && GUEST_LINK_TOKEN_RE.test(body.g) ? body.g : null;
        if (g) {
          markInvitedGuestOpened(slug, g);
          logEvent("guest_opened", slug);
        }
      }
    } catch {
      // malformed beacon — ignore
    }
  }
  return new NextResponse(null, { status: 204 });
}
