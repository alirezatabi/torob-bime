import "dotenv/config";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { extractSample, extractWithAnthropic, aiConfigured } from "@/lib/ai/extraction";
import { sampleProductInputSchema } from "@/lib/schemas/contracts";
import { getInsuranceSchema } from "@/lib/schemas/registry";
import { getPrisma } from "@/lib/data/prisma";
import { storeExtraction } from "@/lib/data/store-extraction";

async function main() {
  const path = process.argv[2];
  const offline = process.argv.includes("--offline");
  if (!path || path.startsWith("--"))
    throw new Error("Usage: npm run ingest -- <product-file.json> [--offline]");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for persistence.");
  if (!offline && !aiConfigured())
    throw new Error(
      "Set ANTHROPIC_API_KEY and LLM_MODEL, or explicitly pass --offline for sample parsing.",
    );
  const raw: unknown = JSON.parse(await readFile(path, "utf8"));
  const products = z.array(sampleProductInputSchema).parse(Array.isArray(raw) ? raw : [raw]);
  let failed = 0;
  for (const product of products) {
    const schema = getInsuranceSchema(product.typeSlug);
    if (!schema || schema.status !== "active")
      throw new Error(`Unknown or inactive schema: ${product.typeSlug}`);
    if (offline && !product.isSampleData)
      throw new Error("The offline parser is restricted to explicitly marked sample data.");
    const result = offline
      ? await extractSample(schema, product.sourceText)
      : await extractWithAnthropic(schema, product.sourceText);
    await storeExtraction(product, schema, result);
    const known = result.values.filter((value) => value.value !== null).length;
    console.log(
      `${product.slug}: ${known}/${schema.fields.length} grounded fields; ${result.valid ? "valid" : "flagged"} (${result.model})`,
    );
    if (!result.valid) {
      failed++;
      console.error(result.issues.join("; "));
    }
  }
  if (failed) process.exitCode = 1;
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Ingestion failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await getPrisma().$disconnect();
  });
