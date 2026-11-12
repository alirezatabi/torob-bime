import { describe, expect, it } from "vitest";
import { containsSensitiveContact, isIranianNationalId, isLuhnCard } from "@/lib/domain/text";

// Generated test-only checksum, not an individual's identity number.
const nationalId = (() => {
  const prefix = "123456789";
  const remainder = [...prefix].reduce((n, digit, i) => n + Number(digit) * (10 - i), 0) % 11;
  return prefix + (remainder < 2 ? remainder : 11 - remainder);
})();
describe("privacy guard on client and server", () => {
  it("recognizes normalized national codes with checksum and ignores invalid ones", () => {
    expect(isIranianNationalId(nationalId)).toBe(true);
    const persian = nationalId.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
    expect(containsSensitiveContact(`کد ملی ${persian}`)).toBe(true);
    expect(isIranianNationalId("1111111111")).toBe(false);
    expect(isIranianNationalId(nationalId.slice(0, 9) + ((Number(nationalId[9]) + 1) % 10))).toBe(
      false,
    );
  });
  it("recognizes Luhn-valid cards and formatted IR IBAN patterns", () => {
    expect(isLuhnCard("4242424242424242")).toBe(true); // public test card number
    expect(containsSensitiveContact("کارت ۴۲۴۲ ۴۲۴۲ ۴۲۴۲ ۴۲۴۲")).toBe(true);
    expect(isLuhnCard("4242424242424243")).toBe(false);
    expect(containsSensitiveContact(`شبا IR${"1".repeat(24)}`)).toBe(true);
    expect(containsSensitiveContact("بودجه ۱۲ میلیون تومان برای سفر")).toBe(false);
  });
});
