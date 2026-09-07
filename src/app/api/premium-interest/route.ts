import { NextResponse } from "next/server";
import { validatePremiumInterest } from "@/lib/premium";
import { addPremiumInterest, getInvite, logEvent } from "@/lib/db";
import { clientKey, premiumInterestLimiter } from "@/lib/ratelimit";
import { isValidSlug } from "@/lib/slug";
import { sidFromRequest } from "@/lib/session";
import type { PremiumInterestInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = premiumInterestLimiter.check(clientKey(req, "premium"), Date.now());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: PremiumInterestInput & { slug?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = validatePremiumInterest(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  // The order form always sends the invite it was opened from; without it the
  // operator gets a name and a phone number and no idea what to activate.
  // Only accepted when the invite actually exists.
  const slug =
    isValidSlug(body.slug) && getInvite(body.slug) ? (body.slug as string) : null;

  try {
    addPremiumInterest(result.value, slug);
    logEvent("premium_interest", slug, result.value.tier, sidFromRequest(req));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("addPremiumInterest failed", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
