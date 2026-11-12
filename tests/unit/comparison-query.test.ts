import { describe, expect, it } from "vitest";
import samples from "@/fixtures/products.json";
import { carBodySchema } from "@/lib/schemas/car-body";
import { readComparisonState } from "@/lib/domain/comparison-query";
const products = samples
  .filter((p) => p.typeSlug === "car-body")
  .map(({ sourceText, ...product }) => {
    void sourceText;
    return { ...product, coverages: [] };
  });
describe("validated shareable comparison URL", () => {
  it("rejects unknown, duplicate and unsuitable fields and products", () => {
    const query = new URLSearchParams(
      "priorities=collision,collision,exclusions,sample_premium,nope&required=minor_damage,vehicle_limit,nope&compare=car-body-sepehr,nope,car-body-aftab,car-body-sepehr&budget=20000000",
    );
    expect(readComparisonState(query, carBodySchema, products)).toEqual({
      priorities: ["collision"],
      constraints: [{ fieldKey: "minor_damage", kind: "covered" }],
      selected: ["car-body-sepehr", "car-body-aftab"],
      budget: 20000000,
    });
  });
  it.each(["", "0", "-1", "  ", "Infinity", "1000000000001"])(
    "does not coerce invalid budget %s to zero",
    (budget) => {
      expect(
        readComparisonState(new URLSearchParams({ budget }), carBodySchema, products).budget,
      ).toBeNull();
    },
  );
});
