import {
  extractionOutputSchema,
  type CoverageField,
  type CoveragePrimitive,
  type CoverageValue,
  type InsuranceSchema,
} from "@/lib/schemas/contracts";
import { normalizePersian } from "@/lib/domain/text";
import {
  hasFieldContext,
  numberHasUnit,
  numberBelongsToField,
  originalEvidenceSpan,
  quotedBoolean,
  quotedNumbers,
} from "./evidence";

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

/** Match a normalized quotation, but always store its exact span from the original source. */
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
    if (!knownKeys.has(row.fieldKey)) issues.push(`Unknown field: ${row.fieldKey}`);
    else if (byKey.has(row.fieldKey)) {
      issues.push(`Duplicate field: ${row.fieldKey}`);
      duplicates.add(row.fieldKey);
    } else byKey.set(row.fieldKey, row);
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
    const evidence = row.evidence?.trim() ? originalEvidenceSpan(sourceText, row.evidence) : null;
    if (!evidence) {
      issues.push(`Evidence is not an exact source quote: ${field.key}`);
      return unknown(field.key);
    }
    // A matching quote does not prove entailment. Context and value checks are conservative.
    if (!hasFieldContext(evidence, field, schema)) {
      issues.push(`Evidence lacks field context: ${field.key}`);
      return unknown(field.key);
    }
    let value = row.value;
    if (field.kind === "text" && typeof value === "string") {
      const originalValue = originalEvidenceSpan(evidence, value);
      if (!originalValue) {
        issues.push(`Text value is not in its evidence: ${field.key}`);
        return unknown(field.key);
      }
      value = originalValue;
    }
    if (field.kind === "number") {
      const matches = quotedNumbers(evidence).filter((number) => number.value === value);
      if (!matches.length) {
        issues.push(`Number cannot be verified in evidence: ${field.key}`);
        return unknown(field.key);
      }
      const withUnit = matches.filter(
        (number) => !field.unit || numberHasUnit(field.unit, number.unit),
      );
      if (!withUnit.length) {
        issues.push(`Unit cannot be verified in evidence: ${field.key}`);
        return unknown(field.key);
      }
      if (!withUnit.some((number) => numberBelongsToField(evidence, number, field, schema))) {
        issues.push(`Number belongs to a different field: ${field.key}`);
        return unknown(field.key);
      }
    }
    if (field.kind === "boolean" && quotedBoolean(evidence, field, schema) !== value) {
      issues.push(`Boolean cannot be verified in evidence: ${field.key}`);
      return unknown(field.key);
    }
    if (
      field.kind === "enum" &&
      !field.options?.some(
        (option) =>
          option.value === value &&
          normalizePersian(evidence).includes(normalizePersian(option.labelFa)),
      )
    ) {
      issues.push(`Enum cannot be verified in evidence: ${field.key}`);
      return unknown(field.key);
    }
    return { ...row, value, evidence };
  });
  return { values, issues };
}
