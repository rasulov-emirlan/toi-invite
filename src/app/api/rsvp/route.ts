import { NextResponse } from "next/server";
import { validateRsvp } from "@/lib/validation";
import { isValidSlug } from "@/lib/slug";
import { addRsvp, logEvent } from "@/lib/db";
import { clientIp, rsvpInviteLimiter, rsvpIpLimiter } from "@/lib/ratelimit";
import type { RsvpInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body extends RsvpInput {
  slug?: string;
}

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export async function POST(req: Request) {
  const now = Date.now();
  const ip = clientIp(req);

  // Tier 1 — coarse per-IP guard before we parse anything.
  const coarse = rsvpIpLimiter.check(`rsvpip:${ip}`, now);
  if (!coarse.allowed) return tooMany(coarse.retryAfterSec);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  // JSON `null`/arrays/primitives parse fine but aren't a usable body.
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!isValidSlug(body.slug)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  // Tier 2 — fine per-(invite, IP) guard: one invite's traffic can't exhaust
  // another's on the same shared carrier IP.
  const fine = rsvpInviteLimiter.check(`rsvp:${body.slug}:${ip}`, now);
  if (!fine.allowed) return tooMany(fine.retryAfterSec);

  const result = validateRsvp(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  try {
    const ok = addRsvp(body.slug, result.value);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    logEvent("rsvp_submitted", body.slug, result.value.attendance);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("addRsvp failed", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
