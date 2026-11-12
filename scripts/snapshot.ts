import "@/lib/server/env";
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import products from "@/fixtures/products.json";
import evalCases from "@/fixtures/extraction-eval.json";
import { aiConfigured, extractWithAnthropic } from "@/lib/ai/extraction";
import { makeSnapshot, type ExtractionSnapshot } from "@/lib/ai/snapshot";
import { sampleProductInputSchema } from "@/lib/schemas/contracts";
import { getInsuranceSchema } from "@/lib/schemas/registry";

async function main() {
  if (!aiConfigured())
    throw new Error(
      "Snapshot requires ANTHROPIC_API_KEY and LLM_MODEL; no offline result is saved as a model snapshot.",
    );
  const evalMode = process.argv.includes("--eval");
  const sources = evalMode
    ? z
        .array(z.object({ id: z.string(), typeSlug: z.string(), sourceText: z.string() }))
        .parse(evalCases)
        .map((row) => ({
          slug: `eval-${row.id.toLowerCase()}`,
          typeSlug: row.typeSlug,
          sourceText: row.sourceText,
        }))
    : z.array(sampleProductInputSchema).parse(products);
  const dir = evalMode ? "fixtures/extractions/eval" : "fixtures/extractions";
  await mkdir(dir, { recursive: true });
  const index: Record<string, ExtractionSnapshot> = {};
  for (const source of sources) {
    const schema = getInsuranceSchema(source.typeSlug);
    if (!schema || schema.status !== "active") throw new Error(`Invalid schema for ${source.slug}`);
    const result = await extractWithAnthropic(schema, source.sourceText);
    const snapshot = makeSnapshot(source, schema, result);
    index[source.slug] = snapshot;
    await writeFile(`${dir}/${source.slug}.json`, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(
      `${source.slug}: ${snapshot.values.filter((value) => value.value !== null).length} grounded fields`,
    );
  }
  // Publish the bundled index only when every extraction was successfully validated.
  const indexPath = evalMode
    ? "fixtures/extractions/eval-index.json"
    : "fixtures/extractions/index.json";
  await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n");
  console.log(
    `Wrote ${sources.length} snapshots to ${dir}; rebuild/reseed before displaying them.`,
  );
}
main().catch((error: unknown) => {
  // SDK and provider exception messages can contain secrets or policy/user text.
  console.error(
    error instanceof Error &&
      /^(Snapshot requires|Invalid schema|Snapshot requires a valid)/.test(error.message)
      ? error.message
      : "Snapshot failed. Check configuration and try again; no model result was fabricated.",
  );
  process.exitCode = 1;
});
