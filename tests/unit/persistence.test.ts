import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import samples from "@/fixtures/products.json";
import { extractSample } from "@/lib/ai/extraction";
import { storeExtraction } from "@/lib/data/store-extraction";
import { getPrisma } from "@/lib/data/prisma";
import { carBodySchema } from "@/lib/schemas/car-body";
import { insuranceSchemaSchema, sampleProductInputSchema } from "@/lib/schemas/contracts";

// Opt-in only: TEST_DATABASE_URL must point at a disposable migrated database.
const testDatabase = process.env.TEST_DATABASE_URL;
const suffix = randomUUID().slice(0, 8);
const schema = insuranceSchemaSchema.parse({ ...carBodySchema, slug: `integration-${suffix}` });
const input = sampleProductInputSchema.parse({
  ...samples[0],
  slug: `product-${suffix}`,
  typeSlug: schema.slug,
  insurerSlug: `insurer-${suffix}`,
});

describe.skipIf(!testDatabase)("Postgres ingestion transaction (optional integration)", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = testDatabase;
  });
  afterAll(async () => {
    const db = getPrisma();
    await db.product.deleteMany({ where: { slug: input.slug } });
    await db.insurer.deleteMany({ where: { slug: input.insurerSlug } });
    await db.insuranceType.deleteMany({ where: { slug: schema.slug } });
    await db.$disconnect();
  });
  it("is idempotent and records an invalid rerun without changing earlier data", async () => {
    const db = getPrisma();
    const result = await extractSample(schema, input.sourceText);
    await storeExtraction(input, schema, result);
    await storeExtraction(input, schema, result);
    const before = await db.product.findUniqueOrThrow({
      where: { slug: input.slug },
      include: { coverages: true, insurer: true },
    });
    const bad = await extractSample(schema, input.sourceText);
    bad.valid = false;
    bad.issues = ["test failure"];
    bad.values[0].evidence = "invented quote";
    await storeExtraction(
      { ...input, sourceText: `${input.sourceText}\nتغییر`, insurerNameFa: "نام نامعتبر" },
      schema,
      bad,
    );
    const after = await db.product.findUniqueOrThrow({
      where: { slug: input.slug },
      include: {
        coverages: true,
        insurer: true,
        extractionRuns: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    expect(after.sourceText).toBe(before.sourceText);
    expect(after.insurer.nameFa).toBe(before.insurer.nameFa);
    expect(after.coverages).toHaveLength(schema.fields.length);
    expect(after.extractionRuns[0].valid).toBe(false);
    expect(await db.product.count({ where: { slug: input.slug } })).toBe(1);
  });
});
