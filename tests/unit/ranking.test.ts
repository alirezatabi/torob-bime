import { describe, expect, it } from "vitest";
import samples from "@/fixtures/products.json";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import {
  rankProducts,
  limitationFacts,
  explanationFacts,
  isNonCoverage,
  scoreContributionFacts,
} from "@/lib/domain/ranking";
import { insuranceSchemaSchema, type ComparableProduct } from "@/lib/schemas/contracts";
import { carBodySchema } from "@/lib/schemas/car-body";

function product(index: number): ComparableProduct {
  const { sourceText, ...data } = samples[index];
  return {
    ...data,
    coverages: groundExtraction(
      extractOffline(carBodySchema, sourceText),
      carBodySchema,
      sourceText,
    ).values,
  };
}

describe("transparent relative ranking", () => {
  it("prioritizes user-selected coverages and surfaces the requested exclusions", () => {
    const products = [product(0), product(1), product(2), product(3)];
    const ranking = rankProducts(products, carBodySchema, ["minor_damage"]);
    expect(ranking[0].product.slug).toBe("car-body-sepehr");
    expect(ranking.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
    const limits = limitationFacts(product(0), carBodySchema, ["minor_damage"]);
    expect(limits[0].field.key).toBe("minor_damage");
    expect(limits[0].coverage.value).toBe(false);
    const explanation = explanationFacts(product(1), carBodySchema, ["deductible"], products);
    expect(explanation.limitation && isNonCoverage(explanation.limitation)).toBe(true);
  });
  it("treats unknown as zero rather than coverage", () => {
    const known = product(0);
    const unknown: ComparableProduct = {
      ...known,
      slug: "unknown",
      coverages: known.coverages.map((row) =>
        row.fieldKey === "collision" ? { ...row, value: null, evidence: null, confidence: 0 } : row,
      ),
    };
    const ranked = rankProducts([unknown, known], carBodySchema, ["collision"]);
    expect(ranked[0].product.slug).toBe(known.slug);
    expect(ranked[1].known).toBe(ranked[0].known - 1);
  });
  it("places confirmed explicit requirements before a higher-scoring non-match", () => {
    const schema = insuranceSchemaSchema.parse({
      ...carBodySchema,
      fields: [
        { key: "required", labelFa: "پوشش لازم", kind: "boolean", weight: 0.1 },
        { key: "bonus", labelFa: "پوشش دیگر", kind: "boolean", weight: 10 },
      ],
    });
    const base = product(0);
    const make = (slug: string, required: boolean | null, bonus: boolean): ComparableProduct => ({
      ...base,
      slug,
      coverages: [
        {
          fieldKey: "required",
          value: required,
          evidence: required === null ? null : "quoted",
          confidence: 1,
        },
        { fieldKey: "bonus", value: bonus, evidence: "quoted", confidence: 1 },
      ],
    });
    const options = [
      make("more-points", false, true),
      make("unknown", null, true),
      make("confirmed", true, false),
    ];
    const ranked = rankProducts(options, schema, [], [{ fieldKey: "required", kind: "covered" }]);
    expect(ranked[0].product.slug).toBe("confirmed");
    expect(ranked[0].score).toBeLessThan(ranked[1].score);
    expect(ranked.map((item) => item.constraintsMet)).toEqual([1, 0, 0]);
    expect(ranked.every((item) => item.constraintsTotal === 1)).toBe(true);
  });
  it("honors lower-is-better numeric and boolean schema fields", () => {
    const schema = insuranceSchemaSchema.parse({
      ...carBodySchema,
      fields: [
        {
          key: "deductible",
          labelFa: "فرانشیز",
          kind: "number",
          unit: "percent",
          higherIsBetter: false,
        },
        { key: "risk", labelFa: "ریسک", kind: "boolean", higherIsBetter: false },
      ],
    });
    const base = product(0);
    const make = (slug: string, deductible: number, risk: boolean): ComparableProduct => ({
      ...base,
      slug,
      coverages: [
        { fieldKey: "deductible", value: deductible, evidence: "quoted", confidence: 1 },
        { fieldKey: "risk", value: risk, evidence: "quoted", confidence: 1 },
      ],
    });
    const ranked = rankProducts([make("higher", 20, true), make("lower", 10, false)], schema, []);
    expect(ranked.map((item) => item.product.slug)).toEqual(["lower", "higher"]);
    expect(ranked[0].score).toBe(100);
    expect(ranked[1].score).toBe(0);
  });
});

describe("grounded score explanations", () => {
  it("uses the exact positive score contributions and excludes unknown, zero and premium values", () => {
    const schema = insuranceSchemaSchema.parse({
      ...carBodySchema,
      fields: [
        { key: "covered", labelFa: "پوشش", kind: "boolean", weight: 2 },
        { key: "limit", labelFa: "سقف", kind: "number", weight: 1 },
        { key: "deductible", labelFa: "فرانشیز", kind: "number", higherIsBetter: false },
        { key: "premium", labelFa: "حق‌بیمه نمونه", kind: "number", isPremium: true },
        { key: "exclusions", labelFa: "استثنا", kind: "text", isExclusion: true },
      ],
    });
    const base = product(0);
    const make = (
      slug: string,
      covered: boolean,
      limit: number,
      deductible: number,
      limitEvidence: string | null = "quoted",
    ): ComparableProduct => ({
      ...base,
      slug,
      coverages: [
        { fieldKey: "covered", value: covered, evidence: "quoted", confidence: 1 },
        { fieldKey: "limit", value: limit, evidence: limitEvidence, confidence: 1 },
        { fieldKey: "deductible", value: deductible, evidence: "quoted", confidence: 1 },
        { fieldKey: "premium", value: 123, evidence: "quoted", confidence: 1 },
        { fieldKey: "exclusions", value: "بدون پوشش", evidence: "quoted", confidence: 1 },
      ],
    });
    const low = make("low", true, 100, 20);
    const high = make("high", false, 200, 10);
    // An ungrounded outlier must not skew either ranking ranges or explanations.
    const ungrounded = make("ungrounded", false, 999, 10, null);
    const products = [low, high, ungrounded];
    const priorities = ["covered"];
    const lowFacts = scoreContributionFacts(low, schema, priorities, products);
    const highFacts = scoreContributionFacts(high, schema, priorities, products);
    expect(lowFacts.map((fact) => fact.field.key)).toEqual(["covered"]);
    expect(lowFacts[0]).toMatchObject({ normalized: 1, weighted: 6, prioritized: true });
    expect(highFacts.map((fact) => fact.field.key)).toEqual(["limit", "deductible"]);
    expect(highFacts.every((fact) => fact.normalized === 1)).toBe(true);
    expect(scoreContributionFacts(ungrounded, schema, priorities, products)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: expect.objectContaining({ key: "limit" }) }),
      ]),
    );
    const totalWeight = 2 * 3 + 1 + 1;
    for (const item of rankProducts(products, schema, priorities)) {
      const contributions = scoreContributionFacts(item.product, schema, priorities, products);
      expect(item.score).toBe(
        Math.round(
          (contributions.reduce((sum, fact) => sum + fact.weighted, 0) / totalWeight) * 100,
        ),
      );
    }
    expect(
      rankProducts(products, schema, priorities).find((item) => item.product.slug === "ungrounded")
        ?.known,
    ).toBe(2);
  });

  it("does not label a deductible alone as a non-covered exclusion", () => {
    const schema = insuranceSchemaSchema.parse({
      ...carBodySchema,
      fields: [{ key: "deductible", labelFa: "فرانشیز", kind: "number", higherIsBetter: false }],
    });
    const onlyDeductible = {
      ...product(0),
      coverages: [{ fieldKey: "deductible", value: 20, evidence: "quoted", confidence: 1 }],
    };
    expect(limitationFacts(onlyDeductible, schema, [])).toHaveLength(1);
    expect(explanationFacts(onlyDeductible, schema, []).limitation).toBeNull();
  });
});

describe("shared field normalization", () => {
  it("handles unknowns, equal numbers, inverse numbers, booleans and enums", async () => {
    const { normalizedFieldScore } = await import("@/lib/domain/ranking");
    const number = carBodySchema.fields.find((field) => field.key === "deductible")!;
    expect(normalizedFieldScore(number, null, { min: 0, max: 10 })).toBeNull();
    expect(normalizedFieldScore(number, 10, { min: 10, max: 10 })).toBe(1);
    expect(normalizedFieldScore(number, 0, { min: 0, max: 10 })).toBe(1);
    expect(normalizedFieldScore(number, 10, { min: 0, max: 10 })).toBe(0);
    const boolean = carBodySchema.fields.find((field) => field.key === "collision")!;
    expect(normalizedFieldScore(boolean, true)).toBe(1);
    expect(normalizedFieldScore(boolean, false)).toBe(0);
    const enumeration = {
      ...boolean,
      kind: "enum" as const,
      options: [
        { value: "a", labelFa: "الف" },
        { value: "b", labelFa: "ب" },
      ],
    };
    expect(normalizedFieldScore(enumeration, "a")).toBe(0);
    expect(normalizedFieldScore(enumeration, "b")).toBe(1);
    expect(normalizedFieldScore(enumeration, "nope")).toBeNull();
  });
});
