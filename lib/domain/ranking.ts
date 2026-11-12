import type {
  ComparableProduct,
  CoverageConstraint,
  CoverageField,
  CoverageValue,
  CoveragePrimitive,
  InsuranceSchema,
} from "@/lib/schemas/contracts";

export type RankedProduct = {
  product: ComparableProduct;
  score: number;
  known: number;
  total: number;
  constraintsMet: number;
  constraintsTotal: number;
};
export function getCoverage(
  product: ComparableProduct,
  fieldKey: string,
): CoverageValue | undefined {
  return product.coverages.find((value) => value.fieldKey === fieldKey);
}

/** Confirmed requirements first, then a relative score; unknown is zero and priorities weigh 3×. */
export function rankProducts(
  products: ComparableProduct[],
  schema: InsuranceSchema,
  priorities: string[],
  constraints: CoverageConstraint[] = [],
): RankedProduct[] {
  const fields = schema.fields.filter(
    (field) => !field.isExclusion && !field.isPremium && field.kind !== "text",
  );
  const requiredKeys = [...new Set(constraints.map((constraint) => constraint.fieldKey))].filter(
    (key) =>
      fields.some((field) => field.key === key && field.kind === "boolean" && field.higherIsBetter),
  );
  const totalWeight = fields.reduce(
    (sum, field) => sum + field.weight * (priorities.includes(field.key) ? 3 : 1),
    0,
  );
  const ranges = new Map<string, { min: number; max: number }>();
  for (const field of fields) {
    const nums = products
      .map((product) => getCoverage(product, field.key)?.value)
      .filter((value): value is number => typeof value === "number");
    if (nums.length) ranges.set(field.key, { min: Math.min(...nums), max: Math.max(...nums) });
  }
  return products
    .map((product) => {
      let weighted = 0;
      let known = 0;
      for (const field of fields) {
        const value = getCoverage(product, field.key)?.value ?? null;
        if (value !== null) known++;
        const normalized = normalizedFieldScore(field, value, ranges.get(field.key)) ?? 0;
        weighted += normalized * field.weight * (priorities.includes(field.key) ? 3 : 1);
      }
      return {
        product,
        score: totalWeight ? Math.round((weighted / totalWeight) * 100) : 0,
        known,
        total: fields.length,
        constraintsMet: requiredKeys.filter((key) => {
          const coverage = getCoverage(product, key);
          return coverage?.value === true && Boolean(coverage.evidence);
        }).length,
        constraintsTotal: requiredKeys.length,
      };
    })
    .sort(
      (a, b) =>
        b.constraintsMet - a.constraintsMet ||
        b.score - a.score ||
        a.product.slug.localeCompare(b.product.slug),
    );
}

export type FieldFact = { field: CoverageField; coverage: CoverageValue };
export function limitationFacts(
  product: ComparableProduct,
  schema: InsuranceSchema,
  priorities: string[],
): FieldFact[] {
  return schema.fields
    .flatMap((field) => {
      const coverage = getCoverage(product, field.key);
      if (!coverage || coverage.value === null || !coverage.evidence || field.isPremium) return [];
      const unfavorableBoolean =
        typeof coverage.value === "boolean" &&
        (field.higherIsBetter === false ? coverage.value : !coverage.value);
      const isLimit =
        field.isExclusion ||
        unfavorableBoolean ||
        (typeof coverage.value === "number" &&
          ((field.higherIsBetter === true && coverage.value === 0) ||
            (field.higherIsBetter === false && coverage.value > 0)));
      return isLimit ? [{ field, coverage }] : [];
    })
    .sort((a, b) => {
      const priorityDifference =
        Number(priorities.includes(b.field.key)) - Number(priorities.includes(a.field.key));
      if (priorityDifference) return priorityDifference;
      return Number(b.field.isExclusion) - Number(a.field.isExclusion);
    });
}

export function isNonCoverage(fact: FieldFact): boolean {
  return (
    fact.field.isExclusion ||
    (fact.coverage.value === false && fact.field.higherIsBetter !== false) ||
    (typeof fact.coverage.value === "number" &&
      fact.coverage.value === 0 &&
      fact.field.higherIsBetter === true)
  );
}

export type NumericRange = { min: number; max: number };
/** One normalization function for ranking and row highlighting; null is never best. */
export function normalizedFieldScore(
  field: CoverageField,
  value: CoveragePrimitive,
  range?: NumericRange,
): number | null {
  if (value === null) return null;
  if (field.kind === "boolean" && typeof value === "boolean")
    return field.higherIsBetter === false ? Number(!value) : Number(value);
  if (field.kind === "number" && typeof value === "number" && range) {
    if (range.min === range.max) return 1;
    const score = (value - range.min) / (range.max - range.min);
    return field.higherIsBetter === false ? 1 - score : score;
  }
  if (field.kind === "enum" && typeof value === "string" && field.options?.length) {
    const index = field.options.findIndex((option) => option.value === value);
    if (index < 0) return null;
    if (field.options.length === 1) return 1;
    const score = index / (field.options.length - 1);
    return field.higherIsBetter === false ? 1 - score : score;
  }
  return null;
}

export function relativeFieldScore(
  product: ComparableProduct,
  field: CoverageField,
  products: ComparableProduct[],
): number | null {
  const value = getCoverage(product, field.key)?.value ?? null;
  const nums = products
    .map((item) => getCoverage(item, field.key)?.value)
    .filter((item): item is number => typeof item === "number");
  const range = nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : undefined;
  return normalizedFieldScore(field, value, range);
}

export function explanationFacts(
  product: ComparableProduct,
  schema: InsuranceSchema,
  priorities: string[],
  products: ComparableProduct[] = [product],
): { positive: FieldFact | null; limitation: FieldFact | null } {
  const candidates = schema.fields
    .flatMap((field) => {
      const coverage = getCoverage(product, field.key);
      if (
        !coverage ||
        coverage.value === null ||
        !coverage.evidence ||
        field.isExclusion ||
        field.isPremium ||
        field.kind === "text"
      )
        return [];
      if (
        typeof coverage.value === "boolean" &&
        (field.higherIsBetter === false ? coverage.value : !coverage.value)
      )
        return [];
      return [{ field, coverage }];
    })
    .sort((a, b) => {
      const contribution = (fact: FieldFact) => {
        const values = products.map((item) => getCoverage(item, fact.field.key)?.value ?? null);
        const differentiates = new Set(values.map((value) => JSON.stringify(value))).size > 1;
        const relative = relativeFieldScore(product, fact.field, products) ?? 0;
        return (
          relative *
          fact.field.weight *
          (priorities.includes(fact.field.key) ? 3 : 1) *
          (differentiates ? 1 : 0.01)
        );
      };
      return contribution(b) - contribution(a) || b.field.weight - a.field.weight;
    });
  const limitations = limitationFacts(product, schema, priorities);
  return {
    positive: candidates[0] ?? null,
    limitation: limitations.find(isNonCoverage) ?? limitations[0] ?? null,
  };
}
