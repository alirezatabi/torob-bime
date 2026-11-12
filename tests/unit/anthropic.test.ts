import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import samples from "@/fixtures/products.json";
import { carBodySchema } from "@/lib/schemas/car-body";
import { extractOffline } from "@/lib/ai/offline-extraction";
import type { CoverageValue } from "@/lib/schemas/contracts";

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));
import { extractWithAnthropic } from "@/lib/ai/extraction";
import { understandIntent } from "@/lib/ai/intent";
import { selectExplanationKeys } from "@/lib/ai/explanations";
import { groundExtraction } from "@/lib/ai/grounding";

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-not-real");
  vi.stubEnv("LLM_MODEL", "test-model-from-env");
  mockCreate.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("Anthropic tool contracts (mocked; not a live model eval)", () => {
  it("uses the configured model, retries fabricated evidence, and records attempts", async () => {
    const source = samples[0].sourceText;
    const good = extractOffline(carBodySchema, source) as { values: CoverageValue[] };
    const bad = structuredClone(good);
    bad.values[0].evidence = "ساختگی";
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: "tool_use", name: "record_coverages", input: bad }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "tool_use", name: "record_coverages", input: good }],
      });
    const result = await extractWithAnthropic(carBodySchema, source);
    expect(result.valid).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.history[0].issues.length).toBeGreaterThan(0);
    expect(mockCreate.mock.calls[0][0].model).toBe("test-model-from-env");
    expect(mockCreate.mock.calls[0][0].tool_choice).toEqual({ type: "auto" });
    expect(mockCreate.mock.calls[0][0].tools[0].strict).toBe(true);
    expect(mockCreate.mock.calls[0][0].system[0].cache_control).toEqual({ type: "ephemeral" });
  });
  it("validates model-selected field keys and retries invalid intent", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            name: "classify_intent",
            input: { typeSlug: "travel", priorities: ["invented"], budgetToman: null },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            name: "classify_intent",
            input: { typeSlug: "travel", priorities: ["medical_limit"], budgetToman: null },
          },
        ],
      });
    const result = await understandIntent("برای سفر درمان می‌خواهم");
    expect(result.mode).toBe("ai");
    expect(result.priorities).toEqual(["medical_limit"]);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
  it("does not accept model-invented budgets or requirements", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "classify_intent",
          input: {
            typeSlug: "travel",
            priorities: [],
            budgetToman: 5000000,
            constraints: [{ fieldKey: "baggage_delay", kind: "covered" }],
          },
        },
      ],
    });
    const result = await understandIntent("برای سفر بیمه می‌خواهم");
    expect(result.mode).toBe("ai");
    expect(result.budgetToman).toBeNull();
    expect(result.constraints).toEqual([]);
  });
  it("rejects invented explanation keys and sends no policy text to the model", async () => {
    const { sourceText, ...data } = samples[0];
    const coverages = groundExtraction(
      extractOffline(carBodySchema, sourceText),
      carBodySchema,
      sourceText,
    ).values;
    const product = { ...data, coverages };
    const response = (positiveFieldKey: string) => ({
      content: [
        {
          type: "tool_use",
          name: "select_facts",
          input: {
            items: [
              { productSlug: product.slug, positiveFieldKey, limitationFieldKey: "exclusions" },
            ],
          },
        },
      ],
    });
    mockCreate
      .mockResolvedValueOnce(response("invented"))
      .mockResolvedValueOnce(response("collision"));
    const result = await selectExplanationKeys([product], carBodySchema, []);
    expect(result.mode).toBe("ai");
    expect(result.items[0].positiveFieldKey).toBe("collision");
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mockCreate.mock.calls[0][0].messages)).not.toContain(sourceText);
    expect(JSON.stringify(mockCreate.mock.calls[0][0].messages)).not.toContain("sourceText");
  });
  it("labels provider failures as rule fallback", async () => {
    mockCreate.mockRejectedValue(new Error("provider unavailable"));
    const result = await understandIntent("برای سفر شنگن بیمه می‌خواهم");
    expect(result.mode).toBe("rules");
    expect(result.typeSlug).toBe("travel");
  });
});
