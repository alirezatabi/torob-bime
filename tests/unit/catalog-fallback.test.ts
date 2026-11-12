import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
const findUnique = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("@/lib/data/prisma", () => ({
  getPrisma: () => ({ insuranceType: { findUnique }, extractionRun: { findFirst } }),
}));
import { getCatalogue } from "@/lib/data/catalog";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("database fallback", () => {
  it("logs safe metadata and tells the UI why the DB failed", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:secret@example.invalid/db");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    findUnique.mockRejectedValue(
      new Error("private request and postgres://user:secret@example.invalid/db"),
    );
    const result = await getCatalogue("car-body");
    expect(result).toMatchObject({ mode: "fallback", fallbackReason: "db-unreachable" });
    expect(result?.products).toHaveLength(4);
    expect(log).toHaveBeenCalled();
    const output = JSON.stringify(log.mock.calls);
    expect(output).toContain("Catalogue database lookup failed");
    expect(output).not.toContain("secret");
    expect(output).not.toContain("private request");
  });
  it("distinguishes an empty database from an invalid stored schema", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://example");
    vi.spyOn(console, "error").mockImplementation(() => {});
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ schema: {}, products: [{}] });
    expect((await getCatalogue("travel"))?.fallbackReason).toBe("empty");
    expect((await getCatalogue("travel"))?.fallbackReason).toBe("invalid-schema");
  });
});
