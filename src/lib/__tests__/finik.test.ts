import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { generateKeyPairSync, createVerify } from "node:crypto";
import { canonicalJsonBody, canonicalString, signCanonical } from "../finik";

describe("finik canonical request", () => {
  it("sorts only top-level body keys, preserving nested order", () => {
    const json = canonicalJsonBody({
      RedirectUrl: "https://x",
      Amount: 990,
      Data: { b: 2, a: 1 },
      CardType: "FINIK_QR",
      PaymentId: "p",
    });
    expect(json).toBe(
      '{"Amount":990,"CardType":"FINIK_QR","Data":{"b":2,"a":1},"PaymentId":"p","RedirectUrl":"https://x"}',
    );
  });

  it("builds the exact canonical string Finik's reference signer produces", () => {
    // Mirrors @mancho.devs/authorizer: method(lower) \n path \n
    // host + sorted x-api-* headers joined with '&' \n json body.
    const data = canonicalString(
      "POST",
      "api.acquiring.averspay.kg",
      "/v1/payment",
      "test-key",
      "1737369000000",
      '{"Amount":1}',
    );
    expect(data).toBe(
      [
        "post",
        "/v1/payment",
        "host:api.acquiring.averspay.kg&x-api-key:test-key&x-api-timestamp:1737369000000",
        '{"Amount":1}',
      ].join("\n"),
    );
  });

  it("produces an RSA-SHA256 signature verifiable with the public key", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const data = canonicalString(
      "POST",
      "api.acquiring.averspay.kg",
      "/v1/payment",
      "k",
      "1",
      "{}",
    );
    const signature = signCanonical(data, privateKey);
    const verifier = createVerify("SHA256");
    verifier.update(data);
    expect(verifier.verify(publicKey, signature, "base64")).toBe(true);
  });
});
