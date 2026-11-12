import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import samples from "@/fixtures/products.json";
import { extractSample } from "@/lib/ai/extraction";
import { storeExtraction } from "@/lib/data/store-extraction";
import { getPrisma } from "@/lib/data/prisma";
import { carBodySchema } from "@/lib/schemas/car-body";
import { sampleProductInputSchema } from "@/lib/schemas/contracts";

// Test the DB round trip, not Next's caching implementation or a model call.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
import { getCatalogue } from "@/lib/data/catalog";

// Opt in only with a disposable migrated database. Never produce a fixture snapshot here.
const testDatabase = process.env.TEST_DATABASE_URL;
const suffix = randomUUID().slice(0, 8);
const input = sampleProductInputSchema.parse({
  ...samples[0],
  slug: `mock-snapshot-${suffix}`,
  insurerSlug: `mock-insurer-${suffix}`,
});

describe.skipIf(!testDatabase)("snapshot provenance database round trip", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = testDatabase;
  });
  afterAll(async () => {
    const db = getPrisma();
    await db.product.deleteMany({ where: { slug: input.slug } });
    await db.insurer.deleteMany({ where: { slug: input.insurerSlug } });
    await db.$disconnect();
  });
  it("retains the original snapshot date, not the later database ingestion date", async () => {
    const generatedAt = "2025-03-04T12:34:56.000Z";
    // Mocked provenance on deterministic sample data: not an Anthropic result.
    const mockResult = {
      ...(await extractSample(carBodySchema, input.sourceText)),
      model: "mock-model-not-live",
    };
    await storeExtraction(input, carBodySchema, mockResult, generatedAt);
    const run = await getPrisma().extractionRun.findFirstOrThrow({
      where: { product: { slug: input.slug }, valid: true },
      orderBy: { createdAt: "desc" },
    });
    expect(run.rawOutput).toMatchObject({ snapshotGeneratedAt: generatedAt });
    const catalogue = await getCatalogue(carBodySchema.slug);
    expect(catalogue?.mode).toBe("database");
    expect(catalogue?.products.find((product) => product.slug === input.slug)?.provenance).toEqual({
      kind: "snapshot",
      model: "mock-model-not-live",
      generatedAt,
    });
  });
});
