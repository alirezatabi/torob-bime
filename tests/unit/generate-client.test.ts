import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("cross-platform Prisma generation", () => {
  it("uses the standard CLI without a dummy engine override", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts["db:generate"]).toBe("prisma generate");
    expect(pkg.scripts.postinstall).toBe("prisma generate");
    expect(readFileSync("prisma/schema.prisma", "utf8")).toContain('engineType = "client"');
  });
  it("keeps the Windows x64 build tools in the npm lockfile", () => {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
      packages: Record<string, { os?: string[]; cpu?: string[]; optional?: boolean }>;
    };
    for (const name of [
      "@next/swc-win32-x64-msvc",
      "@esbuild/win32-x64",
      "@rollup/rollup-win32-x64-msvc",
    ]) {
      expect(lock.packages[`node_modules/${name}`]).toMatchObject({
        os: ["win32"],
        cpu: ["x64"],
        optional: true,
      });
    }
  });
});
