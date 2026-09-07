import { describe, expect, it } from "vitest";
import { formatKgPhone, parseGuestLine, whatsappDigits } from "../phone";

describe("formatKgPhone", () => {
  it("reads back the way a KG organizer writes it", () => {
    expect(formatKgPhone("+996555123456")).toBe("0555 12 34 56");
  });

  it("passes through anything that isn't a KG number", () => {
    expect(formatKgPhone("+79161234567")).toBe("+79161234567");
  });
});

describe("whatsappDigits", () => {
  it("strips the plus wa.me won't accept", () => {
    expect(whatsappDigits("+996555123456")).toBe("996555123456");
  });
});

describe("parseGuestLine", () => {
  it("splits the separator styles organizers actually paste", () => {
    for (const line of [
      "Айбек 0555 12 34 56",
      "Айбек, 0555123456",
      "Айбек — +996555123456",
      "Айбек – 996555123456",
      "Айбек: 0555-12-34-56",
      "Айбек  (0555) 123 456",
    ]) {
      expect(parseGuestLine(line), line).toEqual({
        name: "Айбек",
        phone: "+996555123456",
      });
    }
  });

  it("keeps a plain name as a name", () => {
    expect(parseGuestLine("Гүлнара эже")).toEqual({ name: "Гүлнара эже", phone: null });
  });

  it("keeps digits that are part of the name as written", () => {
    // The number must be at the end of the line — texting the wrong person is
    // worse than not offering the shortcut.
    expect(parseGuestLine("Дом 5, Айбек")).toEqual({ name: "Дом 5, Айбек", phone: null });
  });

  it("does not truncate a line whose trailing digits aren't a KG number", () => {
    expect(parseGuestLine("Айбек 1234567890123")).toEqual({
      name: "Айбек 1234567890123",
      phone: null,
    });
  });

  it("treats a bare number as a name, since there is nobody to address", () => {
    expect(parseGuestLine("0555123456")).toEqual({ name: "0555123456", phone: null });
  });

  it("trims the surrounding whitespace organizers paste in", () => {
    expect(parseGuestLine("  Нурбек ,  0700111222  ")).toEqual({
      name: "Нурбек",
      phone: "+996700111222",
    });
  });
});
