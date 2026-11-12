import "@/lib/server/env";
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import extractionCases from "@/fixtures/extraction-eval.json";
import intentCases from "@/fixtures/intent-eval.json";
import snapshotIndex from "@/fixtures/extractions/eval-index.json";
import { extractSample, extractWithAnthropic, aiConfigured } from "@/lib/ai/extraction";
import { replaySnapshot } from "@/lib/ai/snapshot";
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
const percent = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sameSet = (a: string[], b: string[]) => same([...a].sort(), [...b].sort());

async function main() {
  const live = process.argv.includes("--live");
  const snapshot = process.argv.includes("--snapshot");
  if (live && snapshot) throw new Error("Choose --live OR --snapshot, not both.");
  if (live && !aiConfigured())
    throw new Error(
      "Live eval requires ANTHROPIC_API_KEY and LLM_MODEL. Offline results are never labeled live.",
    );
  const mode = live ? "live-anthropic" : snapshot ? "snapshot-replay" : "offline-rules";
  const cases = z.array(extractionCaseSchema).min(30).parse(extractionCases);
  const utterances = z.array(intentCaseSchema).min(20).parse(intentCases);
  const fields: Record<string, { label: string; correct: number; total: number }> = {};
  const failures: string[] = [];
  let valuesCorrect = 0,
    valuesTotal = 0,
    rawGrounded = 0,
    rawNonNull = 0,
    invalidRuns = 0,
    retriedRuns = 0,
    missingSnapshots = 0,
    evaluatedCases = 0;
  const index: Record<string, unknown> = snapshotIndex;
  for (const test of cases) {
    const schema = getInsuranceSchema(test.typeSlug);
    if (!schema || schema.status !== "active") throw new Error(`Unknown schema in ${test.id}`);
    let result;
    if (snapshot) {
      const source = {
        slug: `eval-${test.id.toLowerCase()}`,
        typeSlug: test.typeSlug,
        sourceText: test.sourceText,
      };
      const replay = replaySnapshot(index[source.slug], source, schema);
      if (!replay) {
        missingSnapshots++;
        failures.push(`${test.id}: snapshot missing, stale, or invalid (not replaced with rules)`);
        continue;
      }
      result = {
        values: replay.values,
        rawOutput: { values: replay.values },
        valid: true,
        attempts: 1,
        issues: [] as string[],
      };
    } else
      result = live
        ? await extractWithAnthropic(schema, test.sourceText)
        : await extractSample(schema, test.sourceText);
    evaluatedCases++;
    if (!result.valid) {
      invalidRuns++;
      failures.push(`${test.id}: invalid extraction (${result.issues.join("; ")})`);
    }
    if (result.attempts > 1) retriedRuns++;
    const raw = extractionOutputSchema.safeParse(result.rawOutput);
    if (raw.success)
      for (const row of raw.data.values)
        if (row.value !== null) {
          rawNonNull++;
          if (row.evidence && test.sourceText.includes(row.evidence)) rawGrounded++;
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
  // Snapshot replay measures extraction only; don't silently mix rule intent into a model score.
  let intentCorrect = 0,
    prioritiesCorrect = 0,
    modelFallbacks = 0;
  if (!snapshot)
    for (const test of utterances) {
      const result = live ? await understandIntent(test.text) : classifyIntentOffline(test.text);
      const modelAvailable = !live || result.mode === "ai";
      if (!modelAvailable) {
        modelFallbacks++;
        failures.push(`${test.id}: model unavailable; rule fallback not counted as model result`);
      }
      if (result.typeSlug === test.expectedType && modelAvailable) intentCorrect++;
      else if (modelAvailable)
        failures.push(
          `${test.id}: expected type ${test.expectedType ?? "clarify"}, got ${result.typeSlug ?? "clarify"}`,
        );
      if (sameSet(result.priorities, test.expectedPriorities) && modelAvailable)
        prioritiesCorrect++;
      else if (modelAvailable)
        failures.push(
          `${test.id}: expected priorities ${JSON.stringify(test.expectedPriorities)}, got ${JSON.stringify(result.priorities)}`,
        );
    }
  const summary = {
    mode,
    generatedAt: new Date().toISOString(),
    extractionCases: cases.length,
    evaluatedCases,
    missingSnapshots,
    valuesChecked: valuesTotal,
    fieldAccuracy: valuesTotal ? percent(valuesCorrect, valuesTotal) : null,
    groundingRate: rawNonNull ? percent(rawGrounded, rawNonNull) : null,
    rawGrounded,
    rawNonNull,
    invalidRuns,
    retriedRuns,
    intentCases: snapshot ? 0 : utterances.length,
    intentAccuracy: snapshot ? null : percent(intentCorrect, utterances.length),
    priorityExactAccuracy: snapshot ? null : percent(prioritiesCorrect, utterances.length),
    modelFallbacks,
    fieldBreakdown: Object.entries(fields).map(([key, value]) => ({
      key,
      ...value,
      accuracy: percent(value.correct, value.total),
    })),
    failures,
  };
  const rows = summary.fieldBreakdown
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(
      (value) =>
        `| ${value.key} (${value.label}) | ${value.correct}/${value.total} | ${value.accuracy}% |`,
    )
    .join("\n");
  const markdown = `# Evaluation report\n\n- Mode: **${mode}**${live ? " (configured LLM_MODEL)" : snapshot ? " (saved model output only; no offline substitution)" : " — deterministic rules, NOT an LLM evaluation"}\n- Generated (UTC): ${summary.generatedAt}\n- Dataset: ${cases.length} synthetic free-form Persian policy documents; ${utterances.length} Persian utterances. These cases and sample wording share authors and are not an independent or expert audit.\n- Extraction: ${valuesTotal ? `${valuesCorrect}/${valuesTotal} labeled values correct (${summary.fieldAccuracy}%)` : "not measured (no valid snapshots)"}, across ${evaluatedCases}/${cases.length} evaluated documents; missing/stale snapshots: ${missingSnapshots}.\n- Exact source quote in raw output: ${rawNonNull ? `${rawGrounded}/${rawNonNull} (${summary.groundingRate}%)` : "not measured (no non-null output)"}. Substring grounding is not semantic entailment. Invalid runs: ${invalidRuns}; retried runs: ${retriedRuns}.\n- Intent: ${snapshot ? "not evaluated in snapshot replay" : `${intentCorrect}/${utterances.length} (${summary.intentAccuracy}%); priorities ${prioritiesCorrect}/${utterances.length} (${summary.priorityExactAccuracy}%); live fallback exclusions: ${modelFallbacks}`}.\n- Pass thresholds: extraction ≥80%, raw grounding ≥95%, intent ≥80% when evaluated; no missing snapshots or live fallbacks.\n\n## Per-field accuracy\n\n| Field | Correct / total | Accuracy |\n| --- | ---: | ---: |\n${rows || "| None | — | — |"}\n\n## Failures\n\n${failures.length ? failures.map((failure) => `- ${failure.replace(/\n/g, " ")}`).join("\n") : "- None on this limited fixture set."}\n\n## Limits\n\nThe offline parser is a limited set of rules and cannot resolve every unstructured policy or implication. Snapshot replay is not a new live model call. All companies, plans, policies and annual premiums are fictional. Checking the presence, context and unit of a quotation is not proof that it entails the value; users must review the complete terms.\n`;
  await mkdir("docs", { recursive: true });
  const path = mode === "offline-rules" ? "docs/EVAL_REPORT.md" : `docs/EVAL_REPORT-${mode}.md`;
  await writeFile(path, markdown);
  if (mode === "offline-rules") {
    await writeFile("fixtures/eval-summary.json", JSON.stringify(summary, null, 2) + "\n");
    await writeFile("fixtures/eval-report.json", JSON.stringify(markdown) + "\n");
  } else
    await writeFile(`fixtures/eval-summary-${mode}.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(
    `Mode: ${mode}\nExtraction: ${valuesTotal ? `${valuesCorrect}/${valuesTotal} (${summary.fieldAccuracy}%)` : "not measured"} from ${evaluatedCases}/${cases.length}; missing snapshots ${missingSnapshots}\nEvidence grounding: ${rawNonNull ? `${rawGrounded}/${rawNonNull} (${summary.groundingRate}%)` : "not measured (no non-null output)"}\nIntent: ${snapshot ? "not evaluated" : `${intentCorrect}/${utterances.length} (${summary.intentAccuracy}%)`}\nFailures: ${failures.length}. Report: ${path}`,
  );
  if (
    !valuesTotal ||
    !rawNonNull ||
    (summary.fieldAccuracy !== null && summary.fieldAccuracy < 80) ||
    (summary.groundingRate !== null && summary.groundingRate < 95) ||
    (!snapshot && (summary.intentAccuracy ?? 0) < 80) ||
    missingSnapshots ||
    modelFallbacks
  )
    process.exitCode = 1;
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error &&
      /^(Choose --live|Live eval requires|Unknown schema|Unknown field)/.test(error.message)
      ? error.message
      : "Evaluation failed. Check configuration.",
  );
  process.exitCode = 1;
});
