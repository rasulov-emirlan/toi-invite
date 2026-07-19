import "server-only";
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * Finik (Averspay) acquiring API client — QR payments in som.
 *
 * Auth per Finik's Web SDK docs: every request carries `x-api-key`,
 * `x-api-timestamp` (ms, valid ~10s) and a `signature` header — RSA-SHA256
 * over a canonical string of method/path/headers/body, base64-encoded, signed
 * with OUR private key whose public half is registered with Finik. The
 * canonical format matches Finik's reference signer (@mancho.devs/authorizer):
 *
 *   method(lower) \n path \n host:<host>&x-api-key:<k>&x-api-timestamp:<ts>
 *   [\n query] \n JSON body with TOP-LEVEL keys sorted
 */

const FINIK_HOST = process.env.FINIK_HOST ?? "api.acquiring.averspay.kg";
const PAYMENT_PATH = "/v1/payment";

interface FinikConfig {
  apiKey: string;
  accountId: string;
  privateKey: string;
}

let cached: FinikConfig | null | undefined;

/** Env-driven config; the private key arrives as a mounted PEM file. */
function config(): FinikConfig | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.FINIK_API_KEY;
  const accountId = process.env.FINIK_ACCOUNT_ID;
  const keyFile = process.env.FINIK_PRIVATE_KEY_FILE;
  if (!apiKey || !accountId || !keyFile) {
    cached = null;
    return cached;
  }
  try {
    cached = { apiKey, accountId, privateKey: readFileSync(keyFile, "utf8") };
  } catch (err) {
    console.error("finik: cannot read private key", err);
    cached = null;
  }
  return cached;
}

/** Whether real payments are wired up (all three env pieces present). */
export function finikConfigured(): boolean {
  return config() !== null;
}

/** JSON with top-level keys sorted — what Finik signs and what we must send. */
export function canonicalJsonBody(body: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(body).sort((a, b) => a[0].localeCompare(b[0])),
  );
  return JSON.stringify(sorted);
}

/** The exact string Finik verifies. Exported for tests. */
export function canonicalString(
  method: string,
  host: string,
  path: string,
  apiKey: string,
  timestampMs: string,
  jsonBody: string,
): string {
  const headersData = [
    `host:${host}`,
    `x-api-key:${apiKey}`,
    `x-api-timestamp:${timestampMs}`,
  ].join("&");
  return [method.toLowerCase(), path, headersData, jsonBody].join("\n");
}

export function signCanonical(data: string, privateKeyPem: string): string {
  const signer = createSign("SHA256");
  signer.update(data);
  return signer.sign(privateKeyPem, "base64");
}

export interface CreatePaymentArgs {
  /** Our UUID — Finik dedupes on it. */
  paymentId: string;
  amountSom: number;
  description: string;
  /** Where Finik sends the payer's browser after paying. */
  redirectUrl: string;
  /** Where Finik POSTs the final status. */
  webhookUrl: string;
}

/**
 * Create a hosted-payment link. Finik answers 302 with the payment page in
 * `Location`; anything else is an error surfaced to the caller.
 */
export async function createFinikPayment(args: CreatePaymentArgs): Promise<string> {
  const cfg = config();
  if (!cfg) throw new Error("finik not configured");

  const body = canonicalJsonBody({
    Amount: args.amountSom,
    CardType: "FINIK_QR",
    PaymentId: args.paymentId,
    RedirectUrl: args.redirectUrl,
    Data: {
      accountId: cfg.accountId,
      name_en: "Toi-Invite",
      webhookUrl: args.webhookUrl,
      description: args.description,
    },
  });
  const ts = String(Date.now());
  const signature = signCanonical(
    canonicalString("POST", FINIK_HOST, PAYMENT_PATH, cfg.apiKey, ts, body),
    cfg.privateKey,
  );

  const res = await fetch(`https://${FINIK_HOST}${PAYMENT_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "x-api-timestamp": ts,
      signature,
    },
    body,
    redirect: "manual",
  });

  if (res.status === 302) {
    const location = res.headers.get("location");
    if (location) return location;
  }
  const text = await res.text().catch(() => "");
  throw new Error(`finik payment failed: ${res.status} ${text.slice(0, 300)}`);
}
