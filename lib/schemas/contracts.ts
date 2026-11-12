import { z } from "zod";

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const fieldKey = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/)
  .max(80);

export const coverageFieldSchema = z
  .object({
    key: fieldKey,
    labelFa: z.string().min(1),
    kind: z.enum(["number", "boolean", "enum", "text"]),
    unit: z.enum(["toman", "euro", "percent", "month", "day"]).optional(),
    higherIsBetter: z.boolean().default(true),
    weight: z.number().positive().max(10).default(1),
    isExclusion: z.boolean().default(false),
    options: z.array(z.object({ value: z.string(), labelFa: z.string() })).optional(),
    keywords: z.array(z.string()).default([]),
  })
  .superRefine((field, ctx) => {
    if (field.kind === "enum" && !field.options?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enum fields require options." });
    }
    if (field.kind !== "number" && field.unit) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only numbers have units." });
    }
  });

export const insuranceSchemaSchema = z
  .object({
    slug,
    nameFa: z.string().min(1),
    shortNameFa: z.string().min(1),
    descriptionFa: z.string().min(1),
    icon: z.enum(["car", "heart", "plane", "home", "shield"]),
    status: z.enum(["active", "roadmap"]),
    intentKeywords: z.array(z.object({ term: z.string().min(1), weight: z.number().positive() })),
    fields: z.array(coverageFieldSchema),
  })
  .superRefine((schema, ctx) => {
    const keys = schema.fields.map((field) => field.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate field key." });
    }
    if (schema.status === "active" && !schema.fields.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Active types need coverage fields." });
    }
  });

export type CoverageField = z.infer<typeof coverageFieldSchema>;
export type InsuranceSchema = z.infer<typeof insuranceSchemaSchema>;
export type CoveragePrimitive = number | boolean | string | null;

export const coverageValueSchema = z.object({
  fieldKey,
  value: z.union([z.number().finite(), z.boolean(), z.string(), z.null()]),
  evidence: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type CoverageValue = z.infer<typeof coverageValueSchema>;
export const extractionOutputSchema = z.object({ values: z.array(coverageValueSchema) });

export const sampleProductInputSchema = z.object({
  slug,
  typeSlug: slug,
  insurerSlug: slug,
  insurerNameFa: z.string().min(1).max(100),
  nameFa: z.string().min(1).max(100),
  sourceText: z.string().min(1).max(100_000),
  sourceUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), "HTTPS only")
    .nullable(),
  isSampleData: z.boolean(),
});
export type ProductInput = z.infer<typeof sampleProductInputSchema>;

export type ComparableProduct = Omit<ProductInput, "sourceText"> & {
  coverages: CoverageValue[];
};

// A deliberately narrow constraint: an explicitly required boolean coverage.
export const coverageConstraintSchema = z.object({
  fieldKey,
  kind: z.literal("covered"),
});
export type CoverageConstraint = z.infer<typeof coverageConstraintSchema>;

export const userIntentSchema = z.object({
  typeSlug: slug.nullable(),
  priorities: z.array(fieldKey).max(12),
  constraints: z.array(coverageConstraintSchema).max(12),
  budgetToman: z.number().nonnegative().max(1_000_000_000_000).nullable(),
  clarification: z.string().max(240).nullable(),
  mode: z.enum(["rules", "ai"]),
});
export type UserIntent = z.infer<typeof userIntentSchema>;
