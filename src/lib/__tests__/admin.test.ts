import { afterEach, describe, expect, it } from "vitest";
import { isAdminToken } from "../admin";

const TOKEN = "a-strong-admin-token-1234";

afterEach(() => {
  delete process.env.ADMIN_TOKEN;
});

describe("isAdminToken", () => {
  it("accepts only the exact configured token", () => {
    process.env.ADMIN_TOKEN = TOKEN;
    expect(isAdminToken(TOKEN)).toBe(true);
    expect(isAdminToken(TOKEN + "x")).toBe(false);
    expect(isAdminToken("")).toBe(false);
    expect(isAdminToken(null)).toBe(false);
    expect(isAdminToken(undefined)).toBe(false);
  });

  it("fails closed when the env var is unset or too short", () => {
    expect(isAdminToken("anything")).toBe(false);
    process.env.ADMIN_TOKEN = "short";
    expect(isAdminToken("short")).toBe(false);
  });
});
