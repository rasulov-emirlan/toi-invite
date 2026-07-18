import { tokensMatch } from "./token";

/**
 * Gate for operator-only views (premium leads, product stats). The token lives
 * in the ADMIN_TOKEN env var (docker-compose). Fails closed: unset or
 * too-short values reject everything, so a misconfigured deploy can never
 * expose leads.
 */
const MIN_ADMIN_TOKEN_LENGTH = 16;

export function isAdminToken(candidate: unknown): boolean {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (expected.length < MIN_ADMIN_TOKEN_LENGTH) return false;
  return tokensMatch(candidate, expected);
}
