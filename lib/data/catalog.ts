import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/data/prisma";
import samples from "@/fixtures/products.json";
import snapshotIndex from "@/fixtures/extractions/index.json";
import { replaySnapshot } from "@/lib/ai/snapshot";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import { logFailure } from "@/lib/server/log";
import {
  insuranceSchemaSchema,
  sampleProductInputSchema,
  type ComparableProduct,
  type CoverageValue,
  type InsuranceSchema,
  type ProductInput,
} from "@/lib/schemas/contracts";
import { getInsuranceSchema } from "@/lib/schemas/registry";

export type FallbackReason = "db-unreachable" | "empty" | "invalid-schema";
export type Catalogue = {
  schema: InsuranceSchema;
  products: ComparableProduct[];
  mode: "sample" | "database" | "fallback";
  fallbackReason?: FallbackReason;
  version: string;
};

/** A bounded excerpt per field; comparison clients never get an entire source policy. */
export function evidenceContexts(source: string, values: CoverageValue[]): Record<string, string> {
  return Object.fromEntries(
    values.flatMap(({ fieldKey, evidence }) => {
      if (!evidence || evidence.length > 500) return [];
      const index = source.indexOf(evidence);
      if (index < 0) return [];
      const left = Math.max(0, index - 110, source.lastIndexOf("\n", index) + 1);
      const nextNewline = source.indexOf("\n", index + evidence.length);
      const right = Math.min(
        source.length,
        index + evidence.length + 110,
        nextNewline < 0 ? source.length : nextNewline,
      );
      return [[fieldKey, source.slice(left, right)]];
    }),
  );
}

function catalogue(
  schema: InsuranceSchema,
  products: ComparableProduct[],
  mode: Catalogue["mode"],
  fallbackReason?: FallbackReason,
): Catalogue {
  const version = createHash("sha256").update(JSON.stringify({ schema, products })).digest("hex");
  return { schema, products, mode, ...(fallbackReason ? { fallbackReason } : {}), version };
}
const samplesByType = new Map<string, ComparableProduct[]>();
function sampleProducts(schema: InsuranceSchema): ComparableProduct[] {
  const existing = samplesByType.get(schema.slug);
  if (existing) return existing;
  const index: Record<string, unknown> = snapshotIndex;
  const products = samples
    .map((input) => sampleProductInputSchema.parse(input))
    .filter((product) => product.typeSlug === schema.slug)
    .map(({ sourceText, ...product }) => {
      const snapshot = replaySnapshot(index[product.slug], { ...product, sourceText }, schema);
      const coverages =
        snapshot?.values ??
        groundExtraction(extractOffline(schema, sourceText), schema, sourceText).values;
      return {
        ...product,
        coverages,
        provenance: snapshot
          ? { kind: "snapshot" as const, model: snapshot.model, generatedAt: snapshot.generatedAt }
          : { kind: "rules" as const },
        evidenceContext: evidenceContexts(sourceText, coverages),
      };
    });
  samplesByType.set(schema.slug, products);
  return products;
}
function sampleCatalogue(
  schema: InsuranceSchema,
  mode: "sample" | "fallback",
  reason?: FallbackReason,
): Catalogue {
  return catalogue(schema, sampleProducts(schema), mode, reason);
}

// A cheap DB revision query gives every successful ingestion a new cache key even
// when the ingest CLI runs in another process. Next caches the expensive catalogue
// for 60 seconds; database/schema failures are never cached as successes.
class InvalidStoredSchemaError extends Error {}

export const getCatalogue = cache(async function getCatalogue(
  slug: string,
): Promise<Catalogue | null> {
  const localSchema = getInsuranceSchema(slug);
  if (!localSchema || localSchema.status !== "active") return null;
  if (!process.env.DATABASE_URL) return sampleCatalogue(localSchema, "sample");
  try {
    const revision = await getPrisma().extractionRun.findFirst({
      where: { valid: true, product: { type: { slug } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    const read = unstable_cache(
      async () => {
        const type = await getPrisma().insuranceType.findUnique({
          where: { slug },
          include: {
            products: {
              include: {
                insurer: true,
                coverages: true,
                extractionRuns: { where: { valid: true }, orderBy: { createdAt: "desc" }, take: 1 },
              },
              orderBy: { slug: "asc" },
            },
          },
        });
        if (!type || !type.products.length)
          return sampleCatalogue(localSchema, "fallback", "empty");
        const parsed = insuranceSchemaSchema.safeParse(type.schema);
        if (!parsed.success || parsed.data.slug !== slug || parsed.data.status !== "active")
          throw new InvalidStoredSchemaError();
        const schema = parsed.data;
        const products: ComparableProduct[] = type.products.map((product) => {
          const raw = {
            values: product.coverages.map((value) => ({
              fieldKey: value.fieldKey,
              value: value.value,
              evidence: value.evidence,
              confidence: value.confidence,
            })),
          };
          const coverages = groundExtraction(raw, schema, product.sourceText).values;
          const run = product.extractionRuns[0];
          const metadata =
            run?.rawOutput && typeof run.rawOutput === "object" && !Array.isArray(run.rawOutput)
              ? (run.rawOutput as { snapshotGeneratedAt?: unknown })
              : {};
          const savedDate =
            typeof metadata.snapshotGeneratedAt === "string" &&
            !Number.isNaN(Date.parse(metadata.snapshotGeneratedAt))
              ? new Date(metadata.snapshotGeneratedAt).toISOString()
              : run?.createdAt.toISOString();
          const provenance =
            run && run.model !== "offline-structured-parser"
              ? {
                  kind: "snapshot" as const,
                  model: run.model.slice(0, 200),
                  generatedAt: savedDate!,
                }
              : { kind: "rules" as const };
          return {
            slug: product.slug,
            typeSlug: schema.slug,
            insurerSlug: product.insurer.slug,
            insurerNameFa: product.insurer.nameFa,
            nameFa: product.nameFa,
            sourceUrl: product.sourceUrl?.startsWith("https://") ? product.sourceUrl : null,
            isSampleData: product.isSampleData,
            coverages,
            provenance,
            evidenceContext: evidenceContexts(product.sourceText, coverages),
          };
        });
        return catalogue(schema, products, "database");
      },
      ["catalogue-v2", slug, revision?.id ?? "empty"],
      { tags: [`catalogue-${slug}`], revalidate: 60 },
    );
    return await read();
  } catch (error) {
    logFailure("catalogue", error);
    return sampleCatalogue(
      localSchema,
      "fallback",
      error instanceof InvalidStoredSchemaError ? "invalid-schema" : "db-unreachable",
    );
  }
});

/** Full policy is only loaded by the explicit behind-the-scenes page, not comparison cards. */
export async function getProductSource(
  typeSlug: string,
  productSlug: string,
): Promise<ProductInput | null> {
  const cat = await getCatalogue(typeSlug);
  if (!cat?.products.some((product) => product.slug === productSlug)) return null;
  if (cat.mode === "database") {
    try {
      const product = await getPrisma().product.findUnique({
        where: { slug: productSlug },
        include: { insurer: true, type: true },
      });
      if (!product || product.type.slug !== typeSlug) return null;
      const parsed = sampleProductInputSchema.safeParse({
        slug: product.slug,
        typeSlug,
        insurerSlug: product.insurer.slug,
        insurerNameFa: product.insurer.nameFa,
        nameFa: product.nameFa,
        sourceText: product.sourceText,
        sourceUrl: product.sourceUrl,
        isSampleData: product.isSampleData,
      });
      return parsed.success ? parsed.data : null;
    } catch (error) {
      logFailure("catalogue", error);
      return null;
    }
  }
  const sample = samples.find((item) => item.slug === productSlug && item.typeSlug === typeSlug);
  return sample ? sampleProductInputSchema.parse(sample) : null;
}
