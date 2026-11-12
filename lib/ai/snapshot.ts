import { createHash } from "node:crypto";
import { z } from "zod";
import {
  coverageValueSchema,
  type InsuranceSchema,
  type ProductInput,
} from "@/lib/schemas/contracts";
import { groundExtraction } from "./grounding";
import type { ExtractionResult } from "./extraction";

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const snapshotSchema = z
  .object({
    version: z.literal(1),
    productSlug: z.string().min(1).max(80),
    typeSlug: z.string().min(1).max(80),
    sourceHash: hashSchema,
    schemaHash: hashSchema,
    model: z.string().trim().min(1).max(200),
    generatedAt: z.string().datetime(),
    values: z.array(coverageValueSchema),
  })
  .strict();
export type ExtractionSnapshot = z.infer<typeof snapshotSchema>;
type Source = Pick<ProductInput, "slug" | "typeSlug" | "sourceText">;
const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

/** A snapshot can only be made from a successful, freshly grounded provider result. */
export function makeSnapshot(
  source: Source,
  schema: InsuranceSchema,
  result: ExtractionResult,
  now = new Date(),
): ExtractionSnapshot {
  const checked = groundExtraction({ values: result.values }, schema, source.sourceText);
  if (
    !result.valid ||
    checked.issues.length ||
    source.typeSlug !== schema.slug ||
    result.model === "offline-structured-parser"
  )
    throw new Error(
      "Snapshot requires a valid model extraction for the matching policy and schema.",
    );
  return snapshotSchema.parse({
    version: 1,
    productSlug: source.slug,
    typeSlug: source.typeSlug,
    sourceHash: hash(source.sourceText),
    schemaHash: hash(JSON.stringify(schema)),
    model: result.model,
    generatedAt: now.toISOString(),
    values: checked.values,
  });
}

/** Untrusted or stale files never display as model data. */
export function replaySnapshot(
  raw: unknown,
  source: Source,
  schema: InsuranceSchema,
): ExtractionSnapshot | null {
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) return null;
  const snapshot = parsed.data;
  if (
    snapshot.productSlug !== source.slug ||
    snapshot.typeSlug !== source.typeSlug ||
    schema.slug !== source.typeSlug ||
    snapshot.sourceHash !== hash(source.sourceText) ||
    snapshot.schemaHash !== hash(JSON.stringify(schema))
  )
    return null;
  const checked = groundExtraction({ values: snapshot.values }, schema, source.sourceText);
  if (checked.issues.length) return null;
  return { ...snapshot, values: checked.values };
}
