import { Prisma } from "@prisma/client";
import { groundExtraction } from "@/lib/ai/grounding";
import type { ExtractionResult } from "@/lib/ai/extraction";
import type { InsuranceSchema, ProductInput } from "@/lib/schemas/contracts";
import { getPrisma } from "./prisma";

function jsonSafe(value: unknown): Prisma.InputJsonValue {
  try {
    return JSON.parse(JSON.stringify(value ?? { unavailable: true })) as Prisma.InputJsonValue;
  } catch {
    return { unavailable: true };
  }
}

/** Atomic replacement; an invalid rerun is logged but cannot overwrite earlier good data. */
export async function storeExtraction(
  input: ProductInput,
  schema: InsuranceSchema,
  result: ExtractionResult,
): Promise<void> {
  if (input.typeSlug !== schema.slug)
    throw new Error("Product and coverage schema types do not match.");
  if (!input.isSampleData && result.model === "offline-structured-parser")
    throw new Error("Offline parsing is restricted to sample data.");
  const checked = groundExtraction({ values: result.values }, schema, input.sourceText);
  const valid = result.valid && checked.issues.length === 0;
  const issues = [...result.issues, ...checked.issues];
  const runData = {
    model: result.model,
    valid,
    rawOutput: jsonSafe({ final: result.rawOutput, attempts: result.history }),
    errors: issues.length ? jsonSafe(issues) : Prisma.DbNull,
  };
  await getPrisma().$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { slug: input.slug } });
    if (existing && !valid) {
      // No product, insurer, or schema metadata is changed by a failed rerun.
      await tx.extractionRun.create({ data: { productId: existing.id, ...runData } });
      return;
    }
    const type = await tx.insuranceType.upsert({
      where: { slug: schema.slug },
      create: { slug: schema.slug, nameFa: schema.nameFa, schema: jsonSafe(schema) },
      update: { nameFa: schema.nameFa, schema: jsonSafe(schema) },
    });
    const insurer = await tx.insurer.upsert({
      where: { slug: input.insurerSlug },
      create: { slug: input.insurerSlug, nameFa: input.insurerNameFa },
      update: { nameFa: input.insurerNameFa },
    });
    const metadata = {
      insurerId: insurer.id,
      typeId: type.id,
      nameFa: input.nameFa,
      sourceText: input.sourceText,
      sourceUrl: input.sourceUrl,
      isSampleData: input.isSampleData,
    };
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: metadata })
      : await tx.product.create({ data: { slug: input.slug, ...metadata } });
    await tx.coverageValue.deleteMany({ where: { productId: product.id } });
    await tx.coverageValue.createMany({
      data: checked.values.map((value) => ({
        productId: product.id,
        fieldKey: value.fieldKey,
        value: value.value === null ? Prisma.JsonNull : value.value,
        evidence: value.evidence,
        confidence: value.confidence,
      })),
    });
    await tx.extractionRun.create({ data: { productId: product.id, ...runData } });
  });
}
