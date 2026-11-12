import type { CoverageField, CoveragePrimitive, InsuranceSchema } from "@/lib/schemas/contracts";
import { normalizePersian, parsePersianNumber } from "@/lib/domain/text";

function parseValue(field: CoverageField, text: string): CoveragePrimitive {
  const clean = text
    .trim()
    .replace(/[.؛;]+\s*$/, "")
    .trim();
  const normalized = normalizePersian(clean);
  if (field.kind === "boolean") {
    if (/پوشش ندارد|تحت پوشش نیست|ندارد/.test(normalized)) return false;
    if (/پوشش دارد|تحت پوشش است|دارد/.test(normalized)) return true;
    return null;
  }
  if (field.kind === "number") return parsePersianNumber(clean);
  if (field.kind === "enum") {
    return (
      field.options?.find((option) => normalized === normalizePersian(option.labelFa))?.value ??
      null
    );
  }
  return clean || null;
}

/** Deliberately limited parser for the structured, fictional demo policy texts; not an LLM. */
export function extractOffline(schema: InsuranceSchema, sourceText: string): unknown {
  const lines = sourceText.split(/\r?\n/);
  return {
    values: schema.fields.map((field) => {
      const line = lines.find((candidate) => {
        const separator = candidate.search(/[:：]/);
        return (
          separator >= 0 &&
          normalizePersian(candidate.slice(0, separator)) === normalizePersian(field.labelFa)
        );
      });
      if (!line) return { fieldKey: field.key, value: null, evidence: null, confidence: 0 };
      const separator = line.search(/[:：]/);
      const value = parseValue(field, line.slice(separator + 1));
      return {
        fieldKey: field.key,
        value,
        evidence: value === null ? null : line.trim(),
        confidence: value === null ? 0 : 1,
      };
    }),
  };
}
