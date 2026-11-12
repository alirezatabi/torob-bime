import type { CoverageField, CoveragePrimitive, InsuranceSchema } from "@/lib/schemas/contracts";
import { normalizePersian, parsePersianNumber } from "@/lib/domain/text";
import { hasFieldContext, numberHasUnit, quotedBoolean, quotedNumbers } from "./evidence";

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
  if (field.kind === "enum")
    return (
      field.options?.find((option) => normalized === normalizePersian(option.labelFa))?.value ??
      null
    );
  return clean || null;
}

/** Conservative rules, not an LLM. Supports legacy labeled lines and some explicit prose;
 * ambiguous sentences, indirect implications and unknown fields deliberately remain null. */
export function extractOffline(schema: InsuranceSchema, sourceText: string): unknown {
  const lines = sourceText.split(/\r?\n/);
  // Keep numeric decimals intact. Split unrelated claims before trying to associate a value.
  const sentences = sourceText.match(/[^\n؛;!?؟.]+(?:\.(?=\d)[^\n؛;!?؟.]*)*[.!?؟؛;]?/g) ?? [];
  return {
    values: schema.fields.map((field) => {
      const line = lines.find((candidate) => {
        const separator = candidate.search(/[:：]/);
        return (
          separator >= 0 &&
          normalizePersian(candidate.slice(0, separator)) === normalizePersian(field.labelFa)
        );
      });
      if (line) {
        const value = parseValue(field, line.slice(line.search(/[:：]/) + 1));
        return {
          fieldKey: field.key,
          value,
          evidence: value === null ? null : line.trim(),
          confidence: value === null ? 0 : 1,
        };
      }
      for (const sentence of sentences) {
        const evidence = sentence.trim();
        let value: CoveragePrimitive = null;
        if (field.kind === "text" && field.isExclusion) {
          const match = evidence.match(/(?:استثنا(?:های)?[^.]{0,40}آمده است که)\s+(.+?)[.]?$/);
          value = match?.[1]?.trim() ?? null;
        } else if (hasFieldContext(evidence, field, schema)) {
          if (field.kind === "boolean") value = quotedBoolean(evidence, field, schema);
          else if (field.kind === "number") {
            const numbers = quotedNumbers(evidence).filter(
              (item) => !field.unit || numberHasUnit(field.unit, item.unit),
            );
            const unique = [...new Set(numbers.map((item) => item.value))];
            if (unique.length === 1) value = unique[0];
          } else if (field.kind === "enum") {
            const options =
              field.options?.filter((option) =>
                normalizePersian(evidence).includes(normalizePersian(option.labelFa)),
              ) ?? [];
            if (options.length === 1) value = options[0].value;
          }
        }
        if (value !== null) return { fieldKey: field.key, value, evidence, confidence: 1 };
      }
      return { fieldKey: field.key, value: null, evidence: null, confidence: 0 };
    }),
  };
}
