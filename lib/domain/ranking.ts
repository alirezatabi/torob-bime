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

/** The same set of fields is used by intent, ranking and score explanations. */
export function isScoredField(field: CoverageField): boolean {
  return !field.isExclusion && !field.isPremium && field.kind !== "text";
}

export function evidenceBackedValue(
  product: ComparableProduct,
  fieldKey: string,
): CoveragePrimitive {
  const coverage = getCoverage(product, fieldKey);
  // The catalogue grounds values before use; keep the rendering and scoring boundaries defensive too.
  return coverage?.evidence ? coverage.value : null;
}

/** Confirmed requirements first, then a relative score; unknown is zero and priorities weigh 3×. */
export function rankProducts(
  products: ComparableProduct[],
  schema: InsuranceSchema,
  priorities: string[],
  constraints: CoverageConstraint[] = [],
): RankedProduct[] {
  const fields = schema.fields.filter(isScoredField);
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
      .map((product) => evidenceBackedValue(product, field.key))
      .filter((value): value is number => typeof value === "number");
    if (nums.length) ranges.set(field.key, { min: Math.min(...nums), max: Math.max(...nums) });
  }
  return products
    .map((product) => {
      let weighted = 0;
      let known = 0;
      for (const field of fields) {
        const value = evidenceBackedValue(product, field.key);
        const normalized = normalizedFieldScore(field, value, ranges.get(field.key));
        if (normalized !== null) known++;
        weighted += (normalized ?? 0) * field.weight * (priorities.includes(field.key) ? 3 : 1);
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
  const value = evidenceBackedValue(product, field.key);
  const nums = products
    .map((item) => evidenceBackedValue(item, field.key))
    .filter((item): item is number => typeof item === "number");
  const range = nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : undefined;
  return normalizedFieldScore(field, value, range);
}

export type ScoreContribution = FieldFact & {
  normalized: number;
  weighted: number;
  prioritized: boolean;
  differs: boolean;
};

/**
 * Only grounded fields with a positive contribution can explain the score.
 * The normalized value and weighting are exactly those used by rankProducts;
 * neither an exclusion nor a sample premium participates in the score.
 */
export function scoreContributionFacts(
  product: ComparableProduct,
  schema: InsuranceSchema,
  priorities: string[],
  products: ComparableProduct[],
): ScoreContribution[] {
  return schema.fields
    .filter(isScoredField)
    .flatMap((field) => {
      const coverage = getCoverage(product, field.key);
      const normalized = relativeFieldScore(product, field, products);
      if (!coverage?.evidence || coverage.value === null || normalized === null || normalized <= 0)
        return [];
      const prioritized = priorities.includes(field.key);
      const differs =
        new Set(products.map((item) => JSON.stringify(evidenceBackedValue(item, field.key)))).size >
        1;
      return [
        {
          field,
          coverage,
          normalized,
          weighted: normalized * field.weight * (prioritized ? 3 : 1),
          prioritized,
          differs,
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.prioritized) - Number(a.prioritized) ||
        Number(b.differs) - Number(a.differs) ||
        b.weighted - a.weighted,
    );
}

export function explanationFacts(
  product: ComparableProduct,
  schema: InsuranceSchema,
  priorities: string[],
  products: ComparableProduct[] = [product],
): { positive: FieldFact | null; limitation: FieldFact | null } {
  return {
    positive: scoreContributionFacts(product, schema, priorities, products)[0] ?? null,
    // Never describe a deductible or another general limit as a lack of coverage.
    limitation: limitationFacts(product, schema, priorities).find(isNonCoverage) ?? null,
  };
}
