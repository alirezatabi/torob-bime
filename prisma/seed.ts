import "@/lib/server/env";
import samples from "@/fixtures/products.json";
import snapshots from "@/fixtures/extractions/index.json";
import { replaySnapshot } from "@/lib/ai/snapshot";
import { extractSample } from "@/lib/ai/extraction";
import { sampleProductInputSchema } from "@/lib/schemas/contracts";
import { getInsuranceSchema } from "@/lib/schemas/registry";
import { getPrisma } from "@/lib/data/prisma";
import { storeExtraction } from "@/lib/data/store-extraction";

async function main() {
  for (const raw of samples) {
    const product = sampleProductInputSchema.parse(raw);
    const schema = getInsuranceSchema(product.typeSlug);
    if (!schema || !product.isSampleData) throw new Error(`Invalid sample: ${product.slug}`);
    const index: Record<string, unknown> = snapshots;
    const snapshot = replaySnapshot(index[product.slug], product, schema);
    const result = snapshot
      ? {
          values: snapshot.values,
          issues: [],
          valid: true,
          attempts: 1,
          history: [],
          rawOutput: { values: snapshot.values },
          model: snapshot.model,
        }
      : await extractSample(schema, product.sourceText);
    if (!result.valid) throw new Error(`Invalid extraction: ${product.slug}`);
    await storeExtraction(product, schema, result, snapshot?.generatedAt);
  }
  console.log(
    `Seeded ${samples.length} fictional products from valid snapshots where available, otherwise offline rules.`,
  );
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await getPrisma().$disconnect();
  });
