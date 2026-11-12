import { normalizePersian, parsePersianNumber, toLatinDigits } from "@/lib/domain/text";
import type { CoverageField, InsuranceSchema } from "@/lib/schemas/contracts";

type MappedText = { text: string; starts: number[]; ends: number[] };

/** Canonicalize characters while retaining an index into the original UTF-16 string. */
function mapped(value: string): MappedText {
  const result: MappedText = { text: "", starts: [], ends: [] };
  for (let offset = 0; offset < value.length;) {
    const point = value.codePointAt(offset)!;
    const char = String.fromCodePoint(point);
    const end = offset + char.length;
    const canonical = toLatinDigits(char)
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/٫/g, ".")
      .replace(/٬/g, ",")
      .toLowerCase();
    if (!/[\s\u200c\u200d\u0640\u064b-\u065f\u0670]/u.test(canonical)) {
      result.text += canonical;
      for (let i = 0; i < canonical.length; i++) {
        result.starts.push(offset);
        result.ends.push(end);
      }
    }
    offset = end;
  }
  return result;
}

/** Return the exact original source span, never a synthesized or normalized quote. */
export function originalEvidenceSpan(source: string, quotation: string): string | null {
  const sourceMap = mapped(source);
  const needle = mapped(quotation).text;
  if (!needle) return null;
  const index = sourceMap.text.indexOf(needle);
  if (index < 0) return null;
  return source.slice(sourceMap.starts[index], sourceMap.ends[index + needle.length - 1]);
}

function compact(value: string): string {
  return mapped(value).text;
}

/** Generic keywords shared by another field are not sufficient evidence. */
export function fieldAnchors(field: CoverageField, schema: InsuranceSchema): string[] {
  const others = schema.fields.filter((other) => other.key !== field.key);
  const uniqueKeywords = field.keywords.filter((term) => {
    const key = compact(term);
    return (
      key.length >= 2 &&
      !others.some((other) =>
        [other.labelFa, ...other.keywords].some((candidate) => compact(candidate).includes(key)),
      )
    );
  });
  return [field.labelFa, ...field.anchors, ...uniqueKeywords].filter(
    (term) => compact(term).length >= 2,
  );
}

export function hasFieldContext(
  quote: string,
  field: CoverageField,
  schema: InsuranceSchema,
): boolean {
  const text = compact(quote);
  return fieldAnchors(field, schema).some((term) => text.includes(compact(term)));
}

const units: Record<NonNullable<CoverageField["unit"]>, string[]> = {
  toman: ["تومان", "تومن"],
  euro: ["یورو", "€"],
  percent: ["درصد", "٪", "%"],
  month: ["ماه"],
  day: ["روز"],
};

export function quotedNumbers(
  quote: string,
): { value: number; unit: string | null; start: number; end: number }[] {
  const normalized = normalizePersian(quote);
  const pattern =
    /-?\d[\d٬,]*(?:[٫.]\d+)?\s*(?:میلیارد|میلیون|هزار)?\s*(تومان|تومن|ریال|یورو|€|درصد|٪|%|ماه|روز)?/g;
  return [...normalized.matchAll(pattern)].flatMap((match) => {
    const value = parsePersianNumber(match[0]);
    return value === null
      ? []
      : [
          {
            value,
            unit: match[1] ?? null,
            start: match.index!,
            end: match.index! + match[0].length,
          },
        ];
  });
}

/** Reject a number more closely tied to a different field in the same quotation. */
export function numberBelongsToField(
  quote: string,
  number: { start: number; end: number },
  field: CoverageField,
  schema: InsuranceSchema,
): boolean {
  const normalized = normalizePersian(quote);
  const distance = (candidate: CoverageField) => {
    let best = Number.POSITIVE_INFINITY;
    for (const anchor of fieldAnchors(candidate, schema)) {
      const term = normalizePersian(anchor);
      let from = 0;
      while (from < normalized.length) {
        const at = normalized.indexOf(term, from);
        if (at < 0) break;
        const gap =
          at >= number.end
            ? at - number.end
            : number.start >= at + term.length
              ? number.start - (at + term.length)
              : 0;
        best = Math.min(best, gap);
        from = at + Math.max(term.length, 1);
      }
    }
    return best;
  };
  const own = distance(field);
  const competing = Math.min(
    ...schema.fields
      .filter((other) => other.key !== field.key && other.kind !== "text")
      .map(distance),
    Number.POSITIVE_INFINITY,
  );
  return Number.isFinite(own) && own < competing;
}

export function numberHasUnit(
  unit: NonNullable<CoverageField["unit"]>,
  quotedUnit: string | null,
): boolean {
  return quotedUnit !== null && units[unit].includes(quotedUnit);
}

/** Only judge polarity in clauses that actually identify this field. */
export function quotedBoolean(
  quote: string,
  field: CoverageField,
  schema: InsuranceSchema,
): boolean | null {
  const clauses = quote.split(/[،؛;!?؟\n]|\.(?!\d)/);
  const relevant = clauses.filter((clause) => hasFieldContext(clause, field, schema));
  const outcomes = relevant.map((clause) => {
    let text = normalizePersian(clause);
    // Ignore a following independently named field in the same clause.
    const ownPositions = fieldAnchors(field, schema)
      .map((anchor) => text.indexOf(normalizePersian(anchor)))
      .filter((position) => position >= 0);
    const ownPosition = ownPositions.length ? Math.min(...ownPositions) : 0;
    const following = schema.fields
      .filter((other) => other.key !== field.key)
      .map((other) => text.indexOf(normalizePersian(other.labelFa), ownPosition + 1))
      .filter((position) => position > ownPosition);
    if (following.length) text = text.slice(0, Math.min(...following));
    const negative =
      /پوشش\s*(?:ندارد|نیست|نمی\s*دهد|نمی\s*شود)|تحت پوشش (?:نیست|قرار نمی)|خارج از پوشش|فاقد پوشش|مستثنا|پوشش داده نمی/.test(
        text,
      );
    const positive =
      /پوشش دارد|تحت پوشش (?:است|قرار دارد|قرار می)|پوشش داده می\s*شود|جبران می\s*شود/.test(text);
    const prefix = text.slice(0, ownPosition);
    const excluded = /(?:به جز|به استثنای|به استثنا|مگر)\s*$/.test(prefix);
    if ((negative || excluded) && positive) return null;
    if (negative || excluded) return false;
    if (positive) return true;
    return null;
  });
  const known = outcomes.filter((value): value is boolean => value !== null);
  return known.length && known.every((value) => value === known[0]) ? known[0] : null;
}
