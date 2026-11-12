import { describe, expect, it } from "vitest";
import { groundExtraction } from "@/lib/ai/grounding";
import { carBodySchema } from "@/lib/schemas/car-body";
import type { CoveragePrimitive } from "@/lib/schemas/contracts";

function evaluate(source: string, key: string, value: CoveragePrimitive, evidence: string) {
  const raw = {
    values: carBodySchema.fields.map((field) => ({
      fieldKey: field.key,
      value: field.key === key ? value : null,
      evidence: field.key === key ? evidence : null,
      confidence: field.key === key ? 0.9 : 0,
    })),
  };
  return groundExtraction(raw, carBodySchema, source).values.find((row) => row.fieldKey === key)!;
}

describe("grounding realistic Persian evidence", () => {
  it("maps normalized Arabic letters, digits and spacing back to a verbatim source span", () => {
    const source = "بند ۱: سرقت كلی خودرو   تحت پوشش است.";
    const row = evaluate(source, "total_theft", true, "سرقت کلی خودرو تحت پوشش است.");
    expect(row.value).toBe(true);
    expect(row.evidence).toBe("سرقت كلی خودرو   تحت پوشش است.");
    expect(source).toContain(row.evidence);
  });

  it("matches a number with the right unit instead of the clause number", () => {
    const source = "ماده ۵: سقف ارزش خودرو حداکثر ۱۰ میلیون تومان است.";
    expect(evaluate(source, "vehicle_limit", 10_000_000, source).value).toBe(10_000_000);
    expect(
      evaluate(
        source.replace("تومان", "ریال"),
        "vehicle_limit",
        10_000_000,
        source.replace("تومان", "ریال"),
      ).value,
    ).toBeNull();
  });

  it("does not ground parts theft with an overlapping total-theft keyword", () => {
    const source = "سرقت کلی خودرو تحت پوشش است.";
    expect(evaluate(source, "partial_theft", true, source).value).toBeNull();
  });

  it("uses the relevant clause rather than an unrelated negative", () => {
    const source = "تصادف و برخورد تحت پوشش است، فرانشیز ندارد.";
    expect(evaluate(source, "collision", true, source).value).toBe(true);
  });

  it("recognizes an explicit exclusion without treating it as positive coverage", () => {
    const source = "به جز سرقت لوازم خودرو، سایر موارد مطابق قرارداد بررسی می‌شوند.";
    expect(evaluate(source, "partial_theft", false, source).value).toBe(false);
    expect(evaluate(source, "partial_theft", true, source).value).toBeNull();
  });
  it("does not use a different field's amount from a multi-field quote", async () => {
    const { healthSchema } = await import("@/lib/schemas/supplementary-health");
    const source = "سقف بستری و جراحی ۱۰۰ میلیون تومان و سقف دندان‌پزشکی ۱۰ میلیون تومان است.";
    const output = {
      values: healthSchema.fields.map((field) => ({
        fieldKey: field.key,
        value: field.key === "hospital_limit" ? 10_000_000 : null,
        evidence: field.key === "hospital_limit" ? source : null,
        confidence: field.key === "hospital_limit" ? 0.9 : 0,
      })),
    };
    expect(
      groundExtraction(output, healthSchema, source).values.find(
        (v) => v.fieldKey === "hospital_limit",
      )?.value,
    ).toBeNull();
  });
});
