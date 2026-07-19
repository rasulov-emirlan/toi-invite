import { NextResponse } from "next/server";
import { finalizePayment, logEvent, setInvitePremium } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finik's payment-status webhook.
 *
 * Trust model until Finik hands us their webhook public key: the PaymentId is
 * a UUID we minted and only ever sent to Finik and the payer's own redirect —
 * knowing it is the capability. finalizePayment only moves pending → final
 * once, so replays and races cannot flip a settled payment. When the key
 * arrives, add signature verification here on top.
 */
export async function POST(req: Request) {
  let raw = "";
  let body: Record<string, unknown> = {};
  try {
    raw = await req.text();
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Field names differ between Finik doc revisions — accept the known spellings.
  const data = (body.Data ?? body.data) as Record<string, unknown> | undefined;
  const idRaw = [body.PaymentId, body.paymentId, body.payment_id, body.id, data?.paymentId]
    .find((v) => typeof v === "string" && UUID_RE.test(v)) as string | undefined;
  const statusRaw = [body.Status, body.status, body.state, body.paymentStatus, data?.status]
    .find((v) => typeof v === "string") as string | undefined;

  if (!idRaw || !statusRaw) {
    console.error("finik webhook: unrecognized payload shape", raw.slice(0, 300));
    return NextResponse.json({ ok: true });
  }

  const normalized = statusRaw.toUpperCase();
  const status = normalized.includes("SUCCE")
    ? ("succeeded" as const)
    : normalized.includes("FAIL") || normalized.includes("CANCEL") || normalized.includes("EXPIRE")
      ? ("failed" as const)
      : null;
  if (!status) return NextResponse.json({ ok: true });

  const payment = finalizePayment(idRaw, status, raw.slice(0, 4000));
  if (!payment) return NextResponse.json({ ok: true });

  if (status === "succeeded" && payment.invite_slug) {
    setInvitePremium(payment.invite_slug, payment.tier);
  }
  logEvent(status === "succeeded" ? "payment_succeeded" : "payment_failed", payment.invite_slug, payment.tier);
  return NextResponse.json({ ok: true });
}
