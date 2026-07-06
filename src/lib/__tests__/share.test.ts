import { describe, expect, it } from "vitest";
import { whatsappShareUrl } from "../share";

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
