import { normalizePersian, parsePersianNumber } from "@/lib/domain/text";
import { isScoredField } from "@/lib/domain/ranking";
import { activeSchemas } from "@/lib/schemas/registry";
import {
  userIntentSchema,
  type CoverageConstraint,
  type InsuranceSchema,
  type UserIntent,
} from "@/lib/schemas/contracts";

function extractBudget(text: string): number | null {
  // Require an explicit budget and currency; do not guess a unit or choose a range endpoint.
  const clause = normalizePersian(text).match(/(?:بودجه|حق بیمه|هزینه بیمه)(.{0,80})/)?.[1];
  if (!clause) return null;
  const match = clause.match(/([0-9][0-9٬,٫.]*\s*(?:میلیارد|میلیون|هزار)?)\s*(تومان|تومن|ریال)/);
  if (!match) return null;
  const before = clause.slice(0, match.index);
  const after = clause.slice((match.index ?? 0) + match[0].length);
  if (/\d/.test(before) || /^\s*(?:تا|الی|و)\s*\d/.test(after)) return null;
  const parsed = parsePersianNumber(match[1]);
  let value = parsed !== null && match[2] === "ریال" ? parsed / 10 : parsed;
  const monthly = /(?:ماهانه|در ماه|هر ماه|ماهیانه)/.test(after);
  const annually = /(?:سالانه|در سال|هر سال)/.test(after);
  if (monthly && annually) return null;
  if (value !== null && monthly) value *= 12;
  return value !== null && value > 0 && Number.isSafeInteger(value) && value <= 1_000_000_000_000
    ? value
    : null;
}

export function prioritiesForText(text: string, schema: InsuranceSchema): string[] {
  const normalized = normalizePersian(text);
  return schema.fields
    .filter(
      (field) =>
        isScoredField(field) &&
        field.keywords.some((term) => normalized.includes(normalizePersian(term))),
    )
    .map((field) => field.key)
    .slice(0, 12);
}

/**
 * Only recognize unambiguous, explicitly required boolean coverages.
 * Negated, multi-field and implicit constraints are left unspecified rather than guessed.
 */
export function constraintsForText(text: string, schema: InsuranceSchema): CoverageConstraint[] {
  const clauses = normalizePersian(text).split(/[،؛.!?؟]/);
  const required = new Set<string>();
  for (const clause of clauses) {
    if (!/(?:حتما|حتمن|باید|الزامی|ضروری)/.test(clause)) continue;
    if (
      !/پوشش.{0,60}(?:داشته\s*(?:باشد|باشه)|بده(?:د)?|باشد|باشه|قرار\s*گیرد|الزامی|ضروری)/.test(
        clause,
      ) &&
      !/(?:الزامی|ضروری).{0,60}پوشش/.test(clause)
    )
      continue;
    if (
      /(?:آیا|سوال|سؤال|نمی ?خوا|نداشته|نخواهد|بدون|نباش|نپوش|پوشش\s?ند|مهم نیست|لازم نیست|ضروری نیست|الزامی نیست)/.test(
        clause,
      )
    )
      continue;
    const matches = schema.fields.filter(
      (field) =>
        isScoredField(field) &&
        field.kind === "boolean" &&
        field.higherIsBetter &&
        [field.labelFa, ...field.keywords].some((term) => {
          const normalized = normalizePersian(term);
          return normalized.length >= 3 && clause.includes(normalized);
        }),
    );
    if (matches.length === 1) required.add(matches[0].key);
  }
  return [...required].slice(0, 12).map((fieldKey) => ({ fieldKey, kind: "covered" }));
}

/** Transparent offline intent fallback. It asks rather than guessing close category matches. */
export function classifyIntentOffline(text: string, chosenSlug?: string): UserIntent {
  const normalized = normalizePersian(text);
  const scored = activeSchemas
    .map((schema) => ({
      schema,
      score: schema.intentKeywords.reduce(
        (sum, keyword) =>
          sum + (normalized.includes(normalizePersian(keyword.term)) ? keyword.weight : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score);
  const chosen = chosenSlug
    ? activeSchemas.find((schema) => schema.slug === chosenSlug)
    : undefined;
  const ambiguous =
    !chosen &&
    (!scored[0]?.score || (scored[1]?.score > 0 && scored[0].score - scored[1].score < 2));
  const schema = chosen ?? (ambiguous ? undefined : scored[0]?.schema);
  return userIntentSchema.parse({
    typeSlug: schema?.slug ?? null,
    priorities: schema ? prioritiesForText(text, schema) : [],
    constraints: schema ? constraintsForText(text, schema) : [],
    budgetToman: extractBudget(text),
    clarification: schema ? null : "دنبال کدام نوع بیمه هستید؟",
    mode: "rules",
  });
}
