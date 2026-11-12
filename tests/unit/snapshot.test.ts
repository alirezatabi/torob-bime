import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import samples from "@/fixtures/products.json";
import { carBodySchema } from "@/lib/schemas/car-body";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { makeSnapshot, replaySnapshot } from "@/lib/ai/snapshot";

const create = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));
import { extractWithAnthropic } from "@/lib/ai/extraction";

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "mock-only-key");
  vi.stubEnv("LLM_MODEL", "mock-model");
  create.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
describe("model snapshot (mock SDK only, no generated fixture)", () => {
  it("uses model output, stores a date and hashes, and re-grounds it on replay", async () => {
    const source = samples[0];
    create.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "record_coverages",
          input: extractOffline(carBodySchema, source.sourceText),
        },
      ],
    });
    const result = await extractWithAnthropic(carBodySchema, source.sourceText);
    const snapshot = makeSnapshot(source, carBodySchema, result, new Date("2026-01-01T00:00:00Z"));
    expect(snapshot.model).toBe("mock-model");
    expect(snapshot.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(snapshot.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(replaySnapshot(snapshot, source, carBodySchema)).toEqual(snapshot);
    expect(create.mock.calls[0][0].model).toBe("mock-model");
  });
  it("rejects changed source, schema, bad evidence, and offline or invalid runs", async () => {
    const source = samples[0];
    create.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "record_coverages",
          input: extractOffline(carBodySchema, source.sourceText),
        },
      ],
    });
    const result = await extractWithAnthropic(carBodySchema, source.sourceText);
    const snapshot = makeSnapshot(source, carBodySchema, result);
    expect(
      replaySnapshot(snapshot, { ...source, sourceText: source.sourceText + "!" }, carBodySchema),
    ).toBeNull();
    expect(replaySnapshot(snapshot, source, { ...carBodySchema, nameFa: "عوض شده" })).toBeNull();
    const tampered = structuredClone(snapshot);
    tampered.values.find((value) => value.value !== null)!.evidence = "شاهد ساختگی";
    expect(replaySnapshot(tampered, source, carBodySchema)).toBeNull();
    expect(() =>
      makeSnapshot(source, carBodySchema, { ...result, model: "offline-structured-parser" }),
    ).toThrow();
    expect(() => makeSnapshot(source, carBodySchema, { ...result, valid: false })).toThrow();
  });
});
