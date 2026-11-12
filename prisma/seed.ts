import "dotenv/config";
import samples from "@/fixtures/products.json";
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
    const result = await extractSample(schema, product.sourceText);
    if (!result.valid) throw new Error(`Invalid extraction: ${product.slug}`);
    await storeExtraction(product, schema, result);
  }
  console.log(
    `Seeded ${samples.length} explicitly fictional sample products using the offline parser.`,
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
