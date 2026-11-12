import { beforeEach, describe, expect, it, vi } from "vitest";
const select = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/catalog", () => ({
  getCatalogue: async () => ({
    schema: {
      fields: [
        { key: "collision", kind: "boolean", isExclusion: false },
        { key: "theft", kind: "boolean", isExclusion: false },
      ],
    },
    products: [],
    version: "version-1",
  }),
}));
vi.mock("@/lib/ai/explanations", () => ({ selectExplanationKeys: select }));
import { POST as postIntent } from "@/app/api/intent/route";
import { POST as postExplain } from "@/app/api/explain/route";
import { clearExplanationCache } from "@/lib/server/explanation-cache";
import { routeLimiter } from "@/lib/server/rate-limit";

const request = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://example.test/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  routeLimiter.clear();
  clearExplanationCache();
  select.mockReset();
});
describe("API abuse protections", () => {
  it("rejects non-JSON and cross-origin browser requests", async () => {
    expect(
      (
        await postIntent(
          request("intent", { text: "برای سفر بیمه" }, { "content-type": "text/plain" }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await postIntent(
          request("intent", { text: "برای سفر بیمه" }, { origin: "https://attacker.example" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await postIntent(
          request("intent", { text: "برای سفر بیمه" }, { "sec-fetch-site": "cross-site" }),
        )
      ).status,
    ).toBe(403);
  });
  it("returns 429 with Retry-After after the per-client bucket is exhausted", async () => {
    for (let i = 0; i < 20; i++)
      expect((await postIntent(request("intent", { text: "نه" }))).status).toBe(400);
    const result = await postIntent(request("intent", { text: "برای سفر بیمه" }));
    expect(result.status).toBe(429);
    expect(Number(result.headers.get("retry-after"))).toBeGreaterThan(0);
  });
  it("single-flights and caches equivalent sorted priority selections", async () => {
    select.mockResolvedValue({ mode: "ai", items: [] });
    const body = { slug: "car-body", priorities: ["theft", "collision"] };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => postExplain(request("explain", body))),
    );
    expect(results.every((response) => response.status === 200)).toBe(true);
    expect(
      (await postExplain(request("explain", { ...body, priorities: ["collision", "theft"] })))
        .status,
    ).toBe(200);
    expect(select).toHaveBeenCalledTimes(1);
  });
});
