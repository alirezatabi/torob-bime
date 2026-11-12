import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { explanationFacts, isNonCoverage, limitationFacts } from "@/lib/domain/ranking";
import type { ComparableProduct, InsuranceSchema } from "@/lib/schemas/contracts";
import { aiConfigured } from "./extraction";

export type ExplanationKeys = {
  productSlug: string;
  positiveFieldKey: string | null;
  limitationFieldKey: string | null;
};
function fallback(
  products: ComparableProduct[],
  schema: InsuranceSchema,
  priorities: string[],
): ExplanationKeys[] {
  return products.map((product) => {
    const facts = explanationFacts(product, schema, priorities, products);
    return {
      productSlug: product.slug,
      positiveFieldKey: facts.positive?.field.key ?? null,
      limitationFieldKey: facts.limitation?.field.key ?? null,
    };
  });
}
const outputSchema = z.object({
  items: z.array(
    z.object({
      productSlug: z.string(),
      positiveFieldKey: z.string().nullable(),
      limitationFieldKey: z.string().nullable(),
    }),
  ),
});

/** AI selects only existing, grounded fields; Persian sentences are rendered from those values. */
export async function selectExplanationKeys(
  products: ComparableProduct[],
  schema: InsuranceSchema,
  priorities: string[],
): Promise<{ mode: "ai" | "rules"; items: ExplanationKeys[] }> {
  const defaultItems = fallback(products, schema, priorities);
  if (!aiConfigured()) return { mode: "rules", items: defaultItems };
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 0,
    timeout: 30_000,
  });
  // Pass normalized values, labels, and eligibility only — never source text or personal input.
  const data = products.map((product) => ({
    productSlug: product.slug,
    fields: schema.fields.flatMap((field) => {
      const value = product.coverages.find((row) => row.fieldKey === field.key);
      return value?.value !== null && value?.evidence
        ? [
            {
              key: field.key,
              labelFa: field.labelFa,
              value: value.value,
              isExclusion: field.isExclusion,
            },
          ]
        : [];
    }),
  }));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: process.env.LLM_MODEL!,
        max_tokens: 700,
        system:
          "Choose one relevant favorable field and one important non-covered exclusion per product from only the supplied normalized facts. Prefer a false coverage, a zero coverage limit, or an explicit exclusion; use another limitation only if none exist. Prioritize the user's selected keys. Do not write prose or add facts. Use null when no eligible fact exists.",
        messages: [{ role: "user", content: JSON.stringify({ priorities, products: data }) }],
        tools: [
          {
            name: "select_facts",
            description: "Select existing field keys for sourced explanations.",
            input_schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      productSlug: { type: "string" },
                      positiveFieldKey: { anyOf: [{ type: "string" }, { type: "null" }] },
                      limitationFieldKey: { anyOf: [{ type: "string" }, { type: "null" }] },
                    },
                    required: ["productSlug", "positiveFieldKey", "limitationFieldKey"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "select_facts" },
      });
      const tool = response.content.find(
        (block) => block.type === "tool_use" && block.name === "select_facts",
      );
      if (!tool || tool.type !== "tool_use") continue;
      const parsed = outputSchema.parse(tool.input).items;
      if (
        parsed.length !== products.length ||
        new Set(parsed.map((item) => item.productSlug)).size !== products.length
      )
        continue;
      const valid = parsed.every((item) => {
        const product = products.find((p) => p.slug === item.productSlug);
        if (!product) return false;
        const positive = product.coverages.find((row) => row.fieldKey === item.positiveFieldKey);
        const positiveField = schema.fields.find((field) => field.key === item.positiveFieldKey);
        const booleanIsFavorable =
          typeof positive?.value !== "boolean" ||
          (positiveField?.higherIsBetter === false ? !positive.value : positive.value);
        const positiveOk =
          item.positiveFieldKey === null ||
          Boolean(
            positive?.evidence &&
            positive.value !== null &&
            booleanIsFavorable &&
            positiveField &&
            !positiveField.isExclusion &&
            positiveField.kind !== "text",
          );
        const limits = limitationFacts(product, schema, priorities);
        const explicitNonCoverage = limits.filter(isNonCoverage);
        const eligibleLimits = explicitNonCoverage.length ? explicitNonCoverage : limits;
        const limitOk =
          item.limitationFieldKey === null ||
          eligibleLimits.some((fact) => fact.field.key === item.limitationFieldKey);
        return positiveOk && limitOk;
      });
      if (valid) return { mode: "ai", items: parsed };
    } catch {
      /* Fall back to sourced templates if the model is unavailable or invalid. */
    }
  }
  return { mode: "rules", items: defaultItems };
}
