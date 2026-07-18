import { NextResponse } from "next/server";
import { logEvent } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
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
      const body = (await req.json()) as { name?: unknown; slug?: unknown };
      const name = typeof body?.name === "string" ? body.name : "";
      if (TRACKABLE.has(name)) {
        const slug = isValidSlug(body?.slug) ? (body.slug as string) : null;
        logEvent(name, slug);
      }
    } catch {
      // malformed beacon — ignore
    }
  }
  return new NextResponse(null, { status: 204 });
}
