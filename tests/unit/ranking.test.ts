import { describe, expect, it } from "vitest";
import samples from "@/fixtures/products.json";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import {
  rankProducts,
  limitationFacts,
  explanationFacts,
  isNonCoverage,
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
