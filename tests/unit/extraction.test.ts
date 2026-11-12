import { describe, expect, it } from "vitest";
import samples from "@/fixtures/products.json";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import { runExtraction } from "@/lib/ai/extraction";
import { insuranceSchemaSchema, type CoverageValue } from "@/lib/schemas/contracts";
import { carBodySchema } from "@/lib/schemas/car-body";
import { getInsuranceSchema } from "@/lib/schemas/registry";

const sample = samples[0];
function validOutput() {
  return extractOffline(carBodySchema, sample.sourceText) as { values: CoverageValue[] };
}

describe("schema-driven grounded extraction", () => {
  it("grounds every populated sample field in its exact source", () => {
    expect(samples).toHaveLength(12);
    for (const product of samples) {
      const schema = getInsuranceSchema(product.typeSlug)!;
      const result = groundExtraction(
        extractOffline(schema, product.sourceText),
        schema,
        product.sourceText,
      );
      expect(result.issues, product.slug).toEqual([]);
      expect(product.isSampleData).toBe(true);
      expect(result.values).toHaveLength(schema.fields.length);
      for (const value of result.values) {
        expect(value.value).not.toBeNull();
        expect(product.sourceText).toContain(value.evidence);
      }
    }
  });
  it("replaces invented, unrelated, or inconsistent evidence with null", () => {
    const raw = validOutput();
    raw.values.find((v) => v.fieldKey === "collision")!.evidence = "یک نقل‌قول ساختگی";
    const theft = raw.values.find((v) => v.fieldKey === "total_theft")!;
    theft.evidence = validOutput().values.find((v) => v.fieldKey === "collision")!.evidence;
    raw.values.find((v) => v.fieldKey === "deductible")!.value = 99;
    const result = groundExtraction(raw, carBodySchema, sample.sourceText);
    expect(result.issues.length).toBe(3);
    for (const key of ["collision", "total_theft", "deductible"]) {
      expect(result.values.find((v) => v.fieldKey === key)).toMatchObject({
        value: null,
        evidence: null,
        confidence: 0,
      });
    }
  });
  it("rejects duplicates, unknown keys, malformed types, and unverifiable text", () => {
    const raw = validOutput();
    raw.values.push({ ...raw.values[0] });
    raw.values.push({ fieldKey: "invented", value: true, evidence: "fake", confidence: 1 });
    raw.values.find((v) => v.fieldKey === "natural_events")!.value = "yes";
    raw.values.find((v) => v.fieldKey === "exclusions")!.value = "استثنای ساختگی";
    const result = groundExtraction(raw, carBodySchema, sample.sourceText);
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
    expect(result.values.find((v) => v.fieldKey === "collision")?.value).toBeNull();
    expect(result.values.find((v) => v.fieldKey === "natural_events")?.value).toBeNull();
    expect(result.values.find((v) => v.fieldKey === "exclusions")?.value).toBeNull();
  });
  it("does not mistake a quoted amount in rials for a toman amount", () => {
    const source = "سقف ارزش خودرو: ۲ میلیارد ریال.";
    const result = groundExtraction(extractOffline(carBodySchema, source), carBodySchema, source);
    expect(result.issues).toContain("Unit cannot be verified in evidence: vehicle_limit");
    expect(result.values.find((row) => row.fieldKey === "vehicle_limit")).toMatchObject({
      value: null,
      evidence: null,
    });
    const supported = source.replace("ریال", "تومان");
    const valid = groundExtraction(
      extractOffline(carBodySchema, supported),
      carBodySchema,
      supported,
    );
    expect(valid.issues).toEqual([]);
    expect(valid.values.find((row) => row.fieldKey === "vehicle_limit")?.value).toBe(2_000_000_000);
  });
  it("does not invent absent fields", () => {
    const result = groundExtraction(
      extractOffline(carBodySchema, "تصادف و برخورد: پوشش دارد."),
      carBodySchema,
      "تصادف و برخورد: پوشش دارد.",
    );
    expect(result.issues).toEqual([]);
    expect(result.values.find((row) => row.fieldKey === "partial_theft")?.value).toBeNull();
  });
  it("retries invalid responses and records every attempt", async () => {
    let call = 0;
    const result = await runExtraction(
      carBodySchema,
      sample.sourceText,
      async () => {
        call++;
        const raw = validOutput();
        if (call < 3) raw.values[0].evidence = "ساختگی";
        return raw;
      },
      "mock-model",
    );
    expect(result.valid).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.history[0].issues.length).toBeGreaterThan(0);
    expect(result.history[2].issues).toEqual([]);
  });
  it("nulls unsafe values after all retries and does not leak provider errors", async () => {
    const result = await runExtraction(
      carBodySchema,
      sample.sourceText,
      async () => {
        throw new Error("private provider detail");
      },
      "mock-model",
      2,
    );
    expect(result.valid).toBe(false);
    expect(result.values.every((row) => row.value === null)).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });
  it("a new schema field flows through parsing without pipeline changes", () => {
    const schema = insuranceSchemaSchema.parse({
      ...carBodySchema,
      fields: [...carBodySchema.fields, { key: "fire", labelFa: "آتش‌سوزی", kind: "boolean" }],
    });
    const text = `${sample.sourceText}\nآتش‌سوزی: پوشش دارد.`;
    const result = groundExtraction(extractOffline(schema, text), schema, text);
    expect(result.issues).toEqual([]);
    expect(result.values.find((value) => value.fieldKey === "fire")).toMatchObject({
      value: true,
      evidence: "آتش‌سوزی: پوشش دارد.",
    });
    expect(() =>
      insuranceSchemaSchema.parse({ ...schema, fields: [...schema.fields, schema.fields[0]] }),
    ).toThrow();
  });
});
