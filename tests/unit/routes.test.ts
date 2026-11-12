import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postIntent } from "@/app/api/intent/route";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://example.test/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}
afterEach(() => vi.unstubAllEnvs());
describe("intent API", () => {
  it("validates input and returns rule mode without leaking the raw query", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("LLM_MODEL", "");
    const response = await postIntent(
      request(JSON.stringify({ text: "برای سفر شنگن بیمه درمان می‌خواهم" })),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.typeSlug).toBe("travel");
    expect(body.mode).toBe("rules");
    expect(JSON.stringify(body)).not.toContain("برای سفر");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("rejects invalid, extra, and oversized input", async () => {
    expect((await postIntent(request(JSON.stringify({ text: "نه" })))).status).toBe(400);
    expect(
      (await postIntent(request(JSON.stringify({ text: "سفر خارجی", chosenSlug: "not-real" }))))
        .status,
    ).toBe(400);
    expect(
      (await postIntent(request(JSON.stringify({ text: "سفر خارجی", extra: true })))).status,
    ).toBe(400);
    expect((await postIntent(request("x".repeat(5000)))).status).toBe(413);
    expect(
      (
        await postIntent(
          request(JSON.stringify({ text: "برای سفر با شماره ۰۹۱۲۰۰۰۰۰۰۰ بیمه می‌خواهم" })),
        )
      ).status,
    ).toBe(400);
    expect(
      (await postIntent(request(JSON.stringify({ text: "بیمه سفر برای test@example.com" }))))
        .status,
    ).toBe(400);
  });
});
