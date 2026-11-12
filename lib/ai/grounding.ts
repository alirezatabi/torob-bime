import {
  extractionOutputSchema,
  type CoverageField,
  type CoveragePrimitive,
  type CoverageValue,
  type InsuranceSchema,
} from "@/lib/schemas/contracts";
import { normalizePersian, parsePersianNumber } from "@/lib/domain/text";

export type GroundingResult = { values: CoverageValue[]; issues: string[] };

function unknown(fieldKey: string): CoverageValue {
  return { fieldKey, value: null, evidence: null, confidence: 0 };
}

function valueMatchesField(field: CoverageField, value: CoveragePrimitive): boolean {
  if (value === null) return true;
  if (field.kind === "number")
    return typeof value === "number" && value >= 0 && (field.unit !== "percent" || value <= 100);
  if (field.kind === "boolean") return typeof value === "boolean";
  if (field.kind === "text") return typeof value === "string" && value.trim().length > 0;
  return typeof value === "string" && !!field.options?.some((option) => option.value === value);
}

/** The first quoted amount must explicitly use the schema's unit, not a different currency. */
function quoteHasUnit(quote: string, unit: NonNullable<CoverageField["unit"]>): boolean {
  const normalized = normalizePersian(quote).replace(/[٬,]/g, "").replace(/٫/g, ".");
  const amount = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!amount) return false;
  const suffix = normalized
    .slice((amount.index ?? 0) + amount[0].length)
    .trimStart()
    .replace(/^(?:میلیارد|میلیون|هزار)\s*/, "");
  const units: Record<NonNullable<CoverageField["unit"]>, RegExp> = {
    toman: /^(?:تومان|تومن)(?![ا-ی])/,
    euro: /^(?:یورو(?![ا-ی])|€)/,
    percent: /^(?:درصد(?![ا-ی])|٪|%)/,
    month: /^ماه(?![ا-ی])/,
    day: /^روز(?![ا-ی])/,
  };
  return units[unit].test(suffix);
}

/** Validate the whole response and replace every unsafe value with null; never repair a quote. */
export function groundExtraction(
  raw: unknown,
  schema: InsuranceSchema,
  sourceText: string,
): GroundingResult {
  const parsed = extractionOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      values: schema.fields.map((field) => unknown(field.key)),
      issues: [`Invalid output: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`],
    };
  }
  const issues: string[] = [];
  const byKey = new Map<string, CoverageValue>();
  const knownKeys = new Set(schema.fields.map((field) => field.key));
  const duplicates = new Set<string>();
  for (const row of parsed.data.values) {
    if (!knownKeys.has(row.fieldKey)) {
      issues.push(`Unknown field: ${row.fieldKey}`);
    } else if (byKey.has(row.fieldKey)) {
      issues.push(`Duplicate field: ${row.fieldKey}`);
      duplicates.add(row.fieldKey);
    } else {
      byKey.set(row.fieldKey, row);
    }
  }
  const values = schema.fields.map((field) => {
    const row = byKey.get(field.key);
    if (!row) {
      issues.push(`Missing field: ${field.key}`);
      return unknown(field.key);
    }
    if (duplicates.has(field.key)) return unknown(field.key);
    if (!valueMatchesField(field, row.value)) {
      issues.push(`Incorrect value type or option: ${field.key}`);
      return unknown(field.key);
    }
    if (row.value === null) return unknown(field.key);
    if (!row.evidence?.trim() || !sourceText.includes(row.evidence)) {
      issues.push(`Evidence is not an exact source quote: ${field.key}`);
      return unknown(field.key);
    }
    // A verbatim quote alone is not proof of entailment. Conservatively require
    // field context and reject values that cannot be read from the quote. Human
    // verification is still necessary, especially for complex policy language.
    const normalizedQuote = normalizePersian(row.evidence);
    const hasContext = [field.labelFa, ...field.keywords].some(
      (term) => term.length >= 2 && normalizedQuote.includes(normalizePersian(term)),
    );
    if (field.kind !== "text" && !hasContext) {
      issues.push(`Evidence lacks field context: ${field.key}`);
      return unknown(field.key);
    }
    if (
      field.kind === "text" &&
      typeof row.value === "string" &&
      !row.evidence.includes(row.value)
    ) {
      issues.push(`Text value is not in its evidence: ${field.key}`);
      return unknown(field.key);
    }
    if (field.kind === "number" && parsePersianNumber(row.evidence) !== row.value) {
      issues.push(`Number cannot be verified in evidence: ${field.key}`);
      return unknown(field.key);
    }
    if (field.kind === "number" && field.unit && !quoteHasUnit(row.evidence, field.unit)) {
      issues.push(`Unit cannot be verified in evidence: ${field.key}`);
      return unknown(field.key);
    }
    if (field.kind === "boolean") {
      const quote = normalizePersian(row.evidence);
      const negative =
        /پوشش ندارد|تحت پوشش نیست|خارج از پوشش|مستثنا|فاقد پوشش|پوشش داده نمی|ندارد/.test(quote);
      const positive =
        /پوشش دارد|تحت پوشش است|پوشش داده می شود|تحت پوشش قرار دارد|جبران می شود/.test(quote);
      if ((row.value === false && !negative) || (row.value === true && (!positive || negative))) {
        issues.push(`Boolean cannot be verified in evidence: ${field.key}`);
        return unknown(field.key);
      }
    }
    if (
      field.kind === "enum" &&
      !field.options?.some(
        (option) => option.value === row.value && row.evidence?.includes(option.labelFa),
      )
    ) {
      issues.push(`Enum cannot be verified in evidence: ${field.key}`);
      return unknown(field.key);
    }
    return row;
  });
  return { values, issues };
}
