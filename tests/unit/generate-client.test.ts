import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

let temporaryDirectory: string | undefined;

afterEach(() => {
  if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

function runGenerator(options: { overrides?: boolean; exitCode?: number } = {}) {
  // The space in the path exercises Node argument handling without requiring a shell.
  temporaryDirectory = mkdtempSync(join(tmpdir(), "torob npm path with spaces "));
  const scripts = join(temporaryDirectory, "scripts");
  const prismaBuild = join(temporaryDirectory, "node_modules", "prisma", "build");
  const output = join(temporaryDirectory, "cli output.json");
  mkdirSync(scripts, { recursive: true });
  mkdirSync(prismaBuild, { recursive: true });
  copyFileSync(resolve("scripts/generate-client.mjs"), join(scripts, "generate-client.mjs"));
  writeFileSync(
    join(prismaBuild, "index.js"),
    `const fs = require("node:fs");
fs.writeFileSync(process.env.TEST_OUTPUT, JSON.stringify({
  args: process.argv.slice(2),
  schemaEngine: process.env.PRISMA_SCHEMA_ENGINE_BINARY,
  queryEngine: process.env.PRISMA_QUERY_ENGINE_LIBRARY
}));
process.exit(Number(process.env.TEST_EXIT_CODE || 0));`,
  );
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TEST_OUTPUT: output,
    TEST_EXIT_CODE: String(options.exitCode ?? 0),
  };
  delete env.PRISMA_SCHEMA_ENGINE_BINARY;
  delete env.PRISMA_QUERY_ENGINE_LIBRARY;
  const customEngine = join(temporaryDirectory, "custom engine with spaces");
  if (options.overrides) {
    env.PRISMA_SCHEMA_ENGINE_BINARY = customEngine;
    env.PRISMA_QUERY_ENGINE_LIBRARY = customEngine;
  }
  const result = spawnSync(process.execPath, [join(scripts, "generate-client.mjs")], {
    cwd: temporaryDirectory,
    env,
    encoding: "utf8",
  });
  const captured = JSON.parse(readFileSync(output, "utf8")) as {
    args: string[];
    schemaEngine: string;
    queryEngine: string;
  };
  return { result, captured, customEngine };
}

describe("cross-platform Prisma generation", () => {
  it("launches the local CLI through Node when the project path contains spaces", () => {
    const { result, captured } = runGenerator();
    expect(result.status, result.stderr).toBe(0);
    expect(captured.args).toEqual(["generate"]);
    expect(captured.schemaEngine).toBe(process.execPath);
    expect(captured.queryEngine).toBe(process.execPath);
  });

  it("preserves explicit engine overrides and propagates CLI errors", () => {
    const { result, captured, customEngine } = runGenerator({ overrides: true, exitCode: 7 });
    expect(result.status).toBe(7);
    expect(captured.schemaEngine).toBe(customEngine);
    expect(captured.queryEngine).toBe(customEngine);
  });

  it("keeps the Windows x64 build tools in the npm lockfile", () => {
    const lock = JSON.parse(readFileSync(resolve("package-lock.json"), "utf8")) as {
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
