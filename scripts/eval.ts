import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import extractionCases from "@/fixtures/extraction-eval.json";
import intentCases from "@/fixtures/intent-eval.json";
import { extractSample, extractWithAnthropic, aiConfigured } from "@/lib/ai/extraction";
import { understandIntent } from "@/lib/ai/intent";
import { classifyIntentOffline } from "@/lib/domain/intent";
import { extractionOutputSchema } from "@/lib/schemas/contracts";
import { getInsuranceSchema } from "@/lib/schemas/registry";

const primitive = z.union([z.number(), z.boolean(), z.string(), z.null()]);
const extractionCaseSchema = z.object({
  id: z.string(),
  typeSlug: z.string(),
  sourceText: z.string().min(1),
  expected: z.record(primitive),
});
const intentCaseSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  expectedType: z.string().nullable(),
  expectedPriorities: z.array(z.string()),
});
const percent = (numerator: number, denominator: number) =>
  denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sameSet = (a: string[], b: string[]) => same([...a].sort(), [...b].sort());

async function main() {
  const live = process.argv.includes("--live");
  if (live && !aiConfigured())
    throw new Error(
      "Live eval requires ANTHROPIC_API_KEY and LLM_MODEL. No offline results will be labeled as live.",
    );
  const cases = z.array(extractionCaseSchema).min(30).parse(extractionCases);
  const utterances = z.array(intentCaseSchema).min(20).parse(intentCases);
  const fields: Record<string, { label: string; correct: number; total: number }> = {};
  const failures: string[] = [];
  let valuesCorrect = 0,
    valuesTotal = 0,
    rawGrounded = 0,
    rawNonNull = 0,
    invalidRuns = 0,
    retriedRuns = 0;
  for (const test of cases) {
    const schema = getInsuranceSchema(test.typeSlug);
    if (!schema || schema.status !== "active") throw new Error(`Unknown schema in ${test.id}`);
    const result = live
      ? await extractWithAnthropic(schema, test.sourceText)
      : await extractSample(schema, test.sourceText);
    if (!result.valid) {
      invalidRuns++;
      failures.push(`${test.id}: invalid extraction (${result.issues.join("; ")})`);
    }
    if (result.attempts > 1) retriedRuns++;
    const raw = extractionOutputSchema.safeParse(result.rawOutput);
    if (raw.success)
      for (const row of raw.data.values) {
        if (row.value !== null) {
          rawNonNull++;
          if (row.evidence && test.sourceText.includes(row.evidence)) rawGrounded++;
        }
      }
    for (const [key, expected] of Object.entries(test.expected)) {
      const field = schema.fields.find((item) => item.key === key);
      if (!field) throw new Error(`Unknown field ${key} in ${test.id}`);
      const actual = result.values.find((item) => item.fieldKey === key)?.value ?? null;
      const fieldKey = `${test.typeSlug}.${key}`;
      fields[fieldKey] ??= { label: field.labelFa, correct: 0, total: 0 };
      fields[fieldKey].total++;
      valuesTotal++;
      if (same(actual, expected)) {
        fields[fieldKey].correct++;
        valuesCorrect++;
      } else
        failures.push(
          `${test.id}/${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
    }
    if (live) console.log(`Extraction ${test.id}: ${result.valid ? "valid" : "flagged"}`);
  }
  let intentCorrect = 0,
    prioritiesCorrect = 0,
    modelFallbacks = 0;
  for (const test of utterances) {
    const result = live ? await understandIntent(test.text) : classifyIntentOffline(test.text);
    const actualType = result.typeSlug;
    // A fallback is NOT counted as live-model success even if the rule happens to be right.
    const modelAvailable = !live || result.mode === "ai";
    if (!modelAvailable) {
      modelFallbacks++;
      failures.push(`${test.id}: model unavailable; rule fallback not counted as model result`);
    }
    if (actualType === test.expectedType && modelAvailable) intentCorrect++;
    else if (modelAvailable)
      failures.push(
        `${test.id}: expected type ${test.expectedType ?? "clarify"}, got ${actualType ?? "clarify"}`,
      );
    if (sameSet(result.priorities, test.expectedPriorities) && modelAvailable) prioritiesCorrect++;
    else if (modelAvailable)
      failures.push(
        `${test.id}: expected priorities ${JSON.stringify(test.expectedPriorities)}, got ${JSON.stringify(result.priorities)}`,
      );
  }
  const summary = {
    mode: live ? "live-anthropic" : "offline-structured-parser",
    generatedAt: new Date().toISOString(),
    extractionCases: cases.length,
    valuesChecked: valuesTotal,
    fieldAccuracy: percent(valuesCorrect, valuesTotal),
    groundingRate: percent(rawGrounded, rawNonNull),
    rawGrounded,
    rawNonNull,
    invalidRuns,
    retriedRuns,
    intentCases: utterances.length,
    intentAccuracy: percent(intentCorrect, utterances.length),
    priorityExactAccuracy: percent(prioritiesCorrect, utterances.length),
    modelFallbacks,
    fieldBreakdown: Object.entries(fields).map(([key, value]) => ({
      key,
      ...value,
      accuracy: percent(value.correct, value.total),
    })),
    failures,
  };
  const rows = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        `| ${key} (${value.label}) | ${value.correct}/${value.total} | ${percent(value.correct, value.total)}% |`,
    )
    .join("\n");
  const markdown = `# Evaluation report\n\n- Mode: **${summary.mode}**${live ? ` (model from LLM_MODEL)` : " — deterministic parser and keyword classifier, NOT an LLM evaluation"}\n- Generated (UTC): ${summary.generatedAt}\n- Dataset: ${cases.length} separately authored, manually checked fictional policy snippets; ${utterances.length} Persian utterances. This is a small synthetic test, not an insurer or independent domain-expert audit.\n- Extraction: ${valuesCorrect}/${valuesTotal} labeled field values correct (${summary.fieldAccuracy}%).\n- Evidence grounding: ${rawGrounded}/${rawNonNull} non-null values in the final raw response (before sanitization) contain a verbatim source quote (${summary.groundingRate}%). This tests substring grounding, not semantic entailment. Invalid runs: ${invalidRuns}; runs with retries: ${retriedRuns}.\n- Intent type/clarification accuracy: ${intentCorrect}/${utterances.length} (${summary.intentAccuracy}%). Exact priority-set accuracy: ${prioritiesCorrect}/${utterances.length} (${summary.priorityExactAccuracy}%). Live model fallbacks excluded: ${modelFallbacks}.\n- Pass thresholds: extraction ≥80%, raw grounding ≥95%, intent type ≥80%; zero live-model fallbacks.\n\n## Per-field accuracy\n\n| Field | Correct / total | Accuracy |\n| --- | ---: | ---: |\n${rows}\n\n## Failures\n\n${failures.length ? failures.map((failure) => `- ${failure.replace(/\n/g, " ")}`).join("\n") : "- None on this limited fixture set."}\n\n## Limits\n\nThe structured offline parser only understands labeled demo-style lines; it is not evidence of performance on real, unstructured policies. The raw evidence rate does not prove that a quotation entails a value. Unknowns are counted against labeled expectations, and invalid model outputs are never silently called successes.\n`;
  await writeFile("EVAL_REPORT.md", markdown);
  await writeFile("fixtures/eval-summary.json", JSON.stringify(summary, null, 2) + "\n");
  console.log(
    `Mode: ${summary.mode}\nExtraction: ${valuesCorrect}/${valuesTotal} (${summary.fieldAccuracy}%)\nEvidence grounding: ${rawGrounded}/${rawNonNull} (${summary.groundingRate}%)\nIntent: ${intentCorrect}/${utterances.length} (${summary.intentAccuracy}%); priorities ${prioritiesCorrect}/${utterances.length} (${summary.priorityExactAccuracy}%)\nFailures: ${failures.length}. Report: EVAL_REPORT.md`,
  );
  if (
    summary.fieldAccuracy < 80 ||
    summary.groundingRate < 95 ||
    summary.intentAccuracy < 80 ||
    modelFallbacks > 0
  )
    process.exitCode = 1;
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Evaluation failed.");
  process.exitCode = 1;
});
