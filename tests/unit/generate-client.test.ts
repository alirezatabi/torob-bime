import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("cross-platform Prisma generation", () => {
  it("uses the standard CLI without a dummy engine override", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts["db:generate"]).toBe("prisma generate");
    expect(pkg.scripts.postinstall).toBe("prisma generate");
    expect(readFileSync("prisma/schema.prisma", "utf8")).toContain('engineType = "client"');
  });
  it("loads .env.local before .env for the Prisma CLI", () => {
    const dir = mkdtempSync(join(tmpdir(), "torob-prisma-env-"));
    try {
      writeFileSync(
        join(dir, ".env.local"),
        'DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/demo"\n',
      );
      writeFileSync(join(dir, ".env"), 'DATABASE_URL="not-a-postgres-url"\n');
      const result = spawnSync(
        process.execPath,
        [
          resolve("node_modules/prisma/build/index.js"),
          "validate",
          "--config",
          resolve("prisma.config.ts"),
        ],
        {
          cwd: dir,
          env: { ...process.env, DATABASE_URL: undefined, NODE_ENV: "production" },
          encoding: "utf8",
        },
      );
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("valid");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("keeps the Windows x64 build tools in the npm lockfile", () => {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
      packages: Record<string, { os?: string[]; cpu?: string[]; optional?: boolean }>;
    };
    for (const name of [
      "@next/swc-win32-x64-msvc",
      "@tailwindcss/oxide-win32-x64-msvc",
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
