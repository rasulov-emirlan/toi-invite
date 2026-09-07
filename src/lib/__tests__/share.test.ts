import { describe, expect, it } from "vitest";
import { whatsappDirectUrl, whatsappShareUrl } from "../share";

describe("whatsappShareUrl", () => {
  it("builds a wa.me link with the encoded message + url", () => {
    const out = whatsappShareUrl("Мы вас приглашаем!", "https://toi.night.enkiduck.com/i/abcd2345");
    expect(out.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(out.split("text=")[1]);
    expect(text).toBe("Мы вас приглашаем! https://toi.night.enkiduck.com/i/abcd2345");
  });

  it("encodes special characters so the link is valid", () => {
    const out = whatsappShareUrl("той & праздник", "https://x/i/a?to=Гость");
    // spaces and & must be percent-encoded, not left raw
    expect(out).not.toContain(" ");
    expect(out).toContain("%20");
    expect(out).toContain("%26"); // &
  });

  it("shares just the url when the message is empty", () => {
    expect(whatsappShareUrl("  ", "https://x/i/a")).toBe(
      "https://wa.me/?text=" + encodeURIComponent("https://x/i/a"),
    );
  });
});

describe("whatsappDirectUrl", () => {
  it("addresses one number instead of opening the contact picker", () => {
    const out = whatsappDirectUrl("996555123456", "Напоминаем", "https://x/i/a?g=t");
    expect(out.startsWith("https://wa.me/996555123456?text=")).toBe(true);
    expect(decodeURIComponent(out.split("text=")[1])).toBe(
      "Напоминаем https://x/i/a?g=t",
    );
  });

  it("sends just the link when there is no message", () => {
    expect(whatsappDirectUrl("996555123456", "", "https://x/i/a")).toBe(
      "https://wa.me/996555123456?text=" + encodeURIComponent("https://x/i/a"),
    );
  });
});
