import { NextResponse } from "next/server";
import { claimGift, getInvite, listGifts, unclaimGift } from "@/lib/db";
import { toGuestGifts } from "@/lib/gifts";
import { sanitizeGuestName } from "@/lib/personalize";
import { isValidSlug } from "@/lib/slug";
import { clientIp, giftClaimLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  op?: string;
  id?: number;
  guest_ref?: string;
  guest_name?: string;
}

const GUEST_REF_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Guest reserves or releases a wishlist item. Identified by the same opaque
 *  per-browser ref as RSVPs — a valid ref is required (it IS the release key). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = clientIp(req);
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  const rl = giftClaimLimiter.check(`gift:${slug}:${ip}`, Date.now());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const id = Number(body.id);
  const ref = typeof body.guest_ref === "string" ? body.guest_ref : "";
  if (!Number.isInteger(id) || id < 1 || !GUEST_REF_RE.test(ref)) {
    return NextResponse.json({ error: "validation", fields: ["id", "guest_ref"] }, { status: 400 });
  }
  if (!getInvite(slug)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (body.op === "claim") {
    const name = sanitizeGuestName(body.guest_name) || null;
    const result = claimGift(slug, id, ref, name);
    if (result === "not_found") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: result === "claimed", status: result, gifts: toGuestGifts(listGifts(slug), ref) },
      { status: result === "taken" ? 409 : 200 },
    );
  }

  if (body.op === "unclaim") {
    unclaimGift(slug, id, ref, false);
    return NextResponse.json({ ok: true, gifts: toGuestGifts(listGifts(slug), ref) });
  }

  return NextResponse.json({ error: "validation", fields: ["op"] }, { status: 400 });
}
