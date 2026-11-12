import { logFailure } from "@/lib/server/log";
import {
  aiConfigured,
  anthropicClient,
  callAnthropicTool,
  modelFor,
  strictTools,
} from "./anthropic";
import { z } from "zod";
import {
  explanationFacts,
  isNonCoverage,
  limitationFacts,
  scoreContributionFacts,
} from "@/lib/domain/ranking";
import type { ComparableProduct, InsuranceSchema } from "@/lib/schemas/contracts";

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
  const client = anthropicClient();
  // Pass eligible normalized values and labels only — never source text or personal input.
  const data = products.map((product) => {
    const scoreKeys = new Set(
      scoreContributionFacts(product, schema, priorities, products).map((fact) => fact.field.key),
    );
    const nonCoverageKeys = new Set(
      limitationFacts(product, schema, priorities)
        .filter(isNonCoverage)
        .map((fact) => fact.field.key),
    );
    return {
      productSlug: product.slug,
      fields: schema.fields.flatMap((field) => {
        const value = product.coverages.find((row) => row.fieldKey === field.key);
        return value?.value !== null &&
          value?.evidence &&
          (scoreKeys.has(field.key) || nonCoverageKeys.has(field.key))
          ? [
              {
                key: field.key,
                labelFa: field.labelFa,
                value: value.value,
                contributesToScore: scoreKeys.has(field.key),
                isNonCoverage: nonCoverageKeys.has(field.key),
              },
            ]
          : [];
      }),
    };
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const input = await callAnthropicTool(
        client,
        {
          model: modelFor("fast"),
          max_tokens: 700,
          system: [
            {
              type: "text",
              cache_control: { type: "ephemeral" },
              text: "For each product choose one field marked contributesToScore and one marked isNonCoverage, using only the supplied facts. Prefer the user's selected keys. Do not write prose or add facts. Use null when no eligible fact exists. Call select_facts.",
            },
          ],
          messages: [{ role: "user", content: JSON.stringify({ priorities, products: data }) }],
          tools: [
            {
              name: "select_facts",
              strict: strictTools(),
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
          tool_choice: { type: "auto" },
        },
        "select_facts",
      );
      const parsed = outputSchema.parse(input).items;
      if (
        parsed.length !== products.length ||
        new Set(parsed.map((item) => item.productSlug)).size !== products.length
      )
        continue;
      const valid = parsed.every((item) => {
        const product = products.find((p) => p.slug === item.productSlug);
        if (!product) return false;
        const positiveOk =
          item.positiveFieldKey === null ||
          scoreContributionFacts(product, schema, priorities, products).some(
            (fact) => fact.field.key === item.positiveFieldKey,
          );
        const limitOk =
          item.limitationFieldKey === null ||
          limitationFacts(product, schema, priorities)
            .filter(isNonCoverage)
            .some((fact) => fact.field.key === item.limitationFieldKey);
        return positiveOk && limitOk;
      });
      if (valid) return { mode: "ai", items: parsed };
    } catch (error) {
      logFailure("explanation", error);
      /* Fall back to sourced templates if the model is unavailable or invalid. */
    }
  }
  return { mode: "rules", items: defaultItems };
}
