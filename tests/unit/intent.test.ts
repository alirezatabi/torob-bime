import { describe, expect, it } from "vitest";
import cases from "@/fixtures/intent-eval.json";
import { classifyIntentOffline } from "@/lib/domain/intent";
import { normalizePersian, parsePersianNumber, sanitizeInput } from "@/lib/domain/text";

describe("Persian intent and input handling", () => {
  it("meets the documented type threshold on the synthetic set", () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
    const correct = cases.filter(
      (test) => classifyIntentOffline(test.text).typeSlug === test.expectedType,
    ).length;
    expect(correct / cases.length).toBeGreaterThanOrEqual(0.8);
  });
  it("asks instead of guessing an ambiguous category", () => {
    const result = classifyIntentOffline("یک بیمه خوب می‌خواهم");
    expect(result.typeSlug).toBeNull();
    expect(result.clarification).toBeTruthy();
    expect(classifyIntentOffline("یک بیمه خوب می‌خواهم", "travel").typeSlug).toBe("travel");
  });
  it("does not infer a pre-existing condition merely from a family member", () => {
    const result = classifyIntentOffline("برای مادرم بیمه تکمیلی می‌خواهم");
    expect(result.typeSlug).toBe("supplementary-health");
    expect(result.priorities).not.toContain("preexisting");
  });
  it("does not turn a sample premium into a coverage-scoring priority", () => {
    const intent = classifyIntentOffline("برای خودرو حق بیمه نمونه مهم است");
    expect(intent.typeSlug).toBe("car-body");
    expect(intent.priorities).not.toContain("sample_premium");
  });
  it("recognizes only an unambiguous explicit coverage requirement", () => {
    const required = classifyIntentOffline(
      "برای ماشین بیمه بدنه می‌خواهم، حتما خط و خش پوشش داشته باشد",
    );
    expect(required.constraints).toEqual([{ fieldKey: "minor_damage", kind: "covered" }]);
    expect(classifyIntentOffline("بیمه بدنه می‌خواهم، خط و خش مهم است").constraints).toEqual([]);
    expect(classifyIntentOffline("بیمه بدنه، حتما خط و خش پوشش نداشته باشد").constraints).toEqual(
      [],
    );
    expect(classifyIntentOffline("بیمه بدنه، حتما سرقت پوشش داشته باشد").constraints).toEqual([]);
    expect(
      classifyIntentOffline("آیا بیمه بدنه حتما برای خط و خش پوشش داشته باشد؟").constraints,
    ).toEqual([]);
  });
  it("extracts only explicitly labeled budgets and normalizes digits", () => {
    expect(
      classifyIntentOffline("برای سفر بیمه می‌خواهم با بودجه ۵ میلیون تومان").budgetToman,
    ).toBe(5_000_000);
    expect(classifyIntentOffline("برای سفر سقف درمان ۵ میلیون تومان").budgetToman).toBeNull();
    expect(classifyIntentOffline("برای سفر بودجه ۵ میلیون").budgetToman).toBeNull();
    expect(classifyIntentOffline("برای سفر بودجه بین ۳ تا ۵ میلیون تومان").budgetToman).toBeNull();
    expect(classifyIntentOffline("برای سفر بودجه ۱۰ میلیون ریال").budgetToman).toBe(1_000_000);
    expect(classifyIntentOffline("برای سفر بودجه ۵ میلیون تومان در ماه").budgetToman).toBe(
      60_000_000,
    );
    expect(classifyIntentOffline("برای سفر بودجه ۰ تومان").budgetToman).toBeNull();
    expect(parsePersianNumber("۱٫۵ میلیارد تومان")).toBe(1_500_000_000);
    expect(normalizePersian("بيمهٔ خودرو")).toContain("بیمه");
    expect(sanitizeInput("  متن\u0000  آزمایشی \n ")).toBe("متن آزمایشی");
  });
});
