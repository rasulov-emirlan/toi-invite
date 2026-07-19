import { NextResponse } from "next/server";
import { getPaymentByViewToken } from "@/lib/db";
import { clientKey, trackLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Payment-status poll for the thanks page, keyed by the payer's view token
 *  (an unguessable UUID distinct from the Finik PaymentId — knowing it only
 *  exposes the status word, never anything webhook-relevant). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = trackLimiter.check(clientKey(req, "paystatus"), Date.now());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const payment = getPaymentByViewToken(id);
  if (!payment) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ status: payment.status });
}
