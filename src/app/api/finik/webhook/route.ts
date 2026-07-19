import { NextResponse } from "next/server";
import { finalizePayment, getPayment, logEvent, recordPaymentNote } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/finik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_PATH = "/api/finik/webhook";

/**
 * Finik's payment webhook (fires on successful payment; retried at-least-once
 * for up to 24h). Documented payload:
 *
 *   { id, transactionId, status: "success" (any case), amount,
 *     fields: { paymentId: <our PaymentId>, amount, ... }, ... }
 *
 * Authentication, layered:
 *  1. When FINIK_WEBHOOK_PUBLIC_KEY_FILE is set (key from Finik support), the
 *     `signature` header is verified — invalid requests are rejected.
 *  2. Regardless: the PaymentId is a UUID only we and Finik ever see (the
 *     payer gets a separate view token), finalizePayment moves pending→final
 *     exactly once, and the settled amount must match what we charged.
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

  const verdict = verifyWebhookSignature(req.headers, WEBHOOK_PATH, body);
  if (verdict === false) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const fields = (body.fields ?? body.Fields) as Record<string, unknown> | undefined;
  const idRaw = [fields?.paymentId, body.PaymentId, body.paymentId, body.payment_id]
    .find((v) => typeof v === "string" && v.length > 0) as string | undefined;
  const statusRaw = [body.status, body.Status, body.state]
    .find((v) => typeof v === "string") as string | undefined;

  if (!idRaw || !statusRaw) {
    console.error("finik webhook: unrecognized payload shape", raw.slice(0, 300));
    return NextResponse.json({ ok: true });
  }

  // Exact matches only — "UNSUCCESSFUL" must never read as success.
  const normalized = statusRaw.toUpperCase();
  const SUCCESS = new Set(["SUCCESS", "SUCCEEDED"]);
  const FAILURE = new Set(["FAIL", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"]);
  const status = SUCCESS.has(normalized)
    ? ("succeeded" as const)
    : FAILURE.has(normalized)
      ? ("failed" as const)
      : null;
  if (!status) return NextResponse.json({ ok: true });

  // A "success" must carry a real amount covering what we charged — anything
  // else leaves the record pending (visible for manual review), not settled.
  const existing = getPayment(idRaw);
  if (!existing) return NextResponse.json({ ok: true });
  const amount = [fields?.amount, body.amount].find((v) => typeof v === "number") as
    | number
    | undefined;
  if (
    status === "succeeded" &&
    !(typeof amount === "number" && Number.isFinite(amount) && amount >= existing.amount_som)
  ) {
    if (existing.status === "pending" && !existing.webhook_json?.includes("amount_mismatch")) {
      // Log once per payment, not once per webhook retry: remember the
      // mismatch on the record itself (status stays pending for review).
      recordPaymentNote(existing.id, JSON.stringify({ amount_mismatch: amount ?? null, raw: raw.slice(0, 1000) }));
      console.error(
        `finik webhook: amount mismatch for ${existing.id}: got ${amount}, expected ${existing.amount_som}`,
      );
      logEvent("payment_amount_mismatch", existing.invite_slug, existing.tier);
    }
    return NextResponse.json({ ok: true });
  }

  // finalizePayment settles AND activates the invite in one transaction.
  const result = finalizePayment(idRaw, status, raw.slice(0, 4000));
  if (!result) return NextResponse.json({ ok: true });
  const { payment, transitioned } = result;
  // Analytics only on the call that actually settled the payment —
  // Finik retries webhooks, and retries must not double-count anything.
  if (!transitioned) return NextResponse.json({ ok: true });

  logEvent(
    status === "succeeded" ? "payment_succeeded" : "payment_failed",
    payment.invite_slug,
    payment.tier,
  );
  return NextResponse.json({ ok: true });
}
