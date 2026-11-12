import "server-only";
import { getPrisma } from "@/lib/data/prisma";
import samples from "@/fixtures/products.json";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import {
  insuranceSchemaSchema,
  sampleProductInputSchema,
  type ComparableProduct,
  type InsuranceSchema,
} from "@/lib/schemas/contracts";
import { getInsuranceSchema } from "@/lib/schemas/registry";

export type Catalogue = {
  schema: InsuranceSchema;
  products: ComparableProduct[];
  mode: "sample" | "database" | "fallback";
};

function sampleCatalogue(schema: InsuranceSchema, mode: "sample" | "fallback"): Catalogue {
  const products = samples
    .map((input) => sampleProductInputSchema.parse(input))
    .filter((product) => product.typeSlug === schema.slug)
    .map(({ sourceText, ...product }) => ({
      ...product,
      coverages: groundExtraction(extractOffline(schema, sourceText), schema, sourceText).values,
    }));
  return { schema, products, mode };
}

export async function getCatalogue(slug: string): Promise<Catalogue | null> {
  const localSchema = getInsuranceSchema(slug);
  if (!localSchema || localSchema.status !== "active") return null;
  if (!process.env.DATABASE_URL) return sampleCatalogue(localSchema, "sample");
  try {
    const type = await getPrisma().insuranceType.findUnique({
      where: { slug },
      include: {
        products: { include: { insurer: true, coverages: true }, orderBy: { slug: "asc" } },
      },
    });
    if (!type) return sampleCatalogue(localSchema, "fallback");
    const schema = insuranceSchemaSchema.parse(type.schema);
    if (schema.slug !== slug || schema.status !== "active")
      throw new Error("Invalid stored insurance schema.");
    const products: ComparableProduct[] = type.products.map((product) => {
      // DB contents are untrusted too: repeat the type and exact-source checks on every load.
      const raw = {
        values: product.coverages.map((value) => ({
          fieldKey: value.fieldKey,
          value: value.value,
          evidence: value.evidence,
          confidence: value.confidence,
        })),
      };
      return {
        slug: product.slug,
        typeSlug: schema.slug,
        insurerSlug: product.insurer.slug,
        insurerNameFa: product.insurer.nameFa,
        nameFa: product.nameFa,
        sourceUrl: product.sourceUrl?.startsWith("https://") ? product.sourceUrl : null,
        isSampleData: product.isSampleData,
        coverages: groundExtraction(raw, schema, product.sourceText).values,
      };
    });
    // An empty configured database is not represented as real catalogue data.
    return products.length
      ? { schema, products, mode: "database" }
      : sampleCatalogue(localSchema, "fallback");
  } catch {
    return sampleCatalogue(localSchema, "fallback");
  }
}
