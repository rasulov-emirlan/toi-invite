import { NextResponse } from "next/server";
import { validatePremiumInterest } from "@/lib/premium";
import { addPremiumInterest, logEvent } from "@/lib/db";
import { clientKey, premiumInterestLimiter } from "@/lib/ratelimit";
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

  let body: PremiumInterestInput;
  try {
    body = (await req.json()) as PremiumInterestInput;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = validatePremiumInterest(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  try {
    addPremiumInterest(result.value);
    logEvent("premium_interest", null, result.value.tier);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("addPremiumInterest failed", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
