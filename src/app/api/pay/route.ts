import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { addPremiumInterest, createPayment, getInvite, logEvent } from "@/lib/db";
import { getTier, validatePremiumInterest } from "@/lib/premium";
import { createFinikPayment, finikConfigured } from "@/lib/finik";
import { isValidSlug } from "@/lib/slug";
import { BASE_URL } from "@/lib/base-url";
import { clientKey, premiumInterestLimiter } from "@/lib/ratelimit";
import type { PremiumInterestInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body extends PremiumInterestInput {
  /** Optional invite to activate the tier on once the payment settles. */
  slug?: unknown;
}

/**
 * Start a real Finik payment for a paid tier. Also records the lead (same as
 * the interest fake-door) — a started-but-abandoned payment is still a signal.
 */
export async function POST(req: Request) {
  const rl = premiumInterestLimiter.check(clientKey(req, "pay"), Date.now());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  if (!finikConfigured()) {
    // The client falls back to the interest form.
    return NextResponse.json({ error: "payments_unavailable" }, { status: 503 });
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

  const result = validatePremiumInterest(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }
  const clean = result.value;
  const tier = getTier(clean.tier);

  // Optional target invite — only accepted when it actually exists.
  const slug =
    isValidSlug(body.slug) && getInvite(body.slug) ? (body.slug as string) : null;

  addPremiumInterest(clean);

  const paymentId = randomUUID();
  createPayment({
    id: paymentId,
    tier: clean.tier,
    amount_som: tier.priceSom,
    name: clean.name,
    phone: clean.phone,
    locale: clean.locale,
    invite_slug: slug,
  });

  try {
    const url = await createFinikPayment({
      paymentId,
      amountSom: tier.priceSom,
      description: `Toi-Invite ${clean.tier}`,
      redirectUrl: `${BASE_URL}/premium/thanks?pid=${paymentId}&lang=${clean.locale}`,
      webhookUrl: `${BASE_URL}/api/finik/webhook`,
    });
    logEvent("payment_started", slug, clean.tier);
    return NextResponse.json({ url, pid: paymentId }, { status: 201 });
  } catch (err) {
    console.error("finik create payment failed", err);
    return NextResponse.json({ error: "provider" }, { status: 502 });
  }
}
