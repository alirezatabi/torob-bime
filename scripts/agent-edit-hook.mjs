// Claude-compatible hooks; fixed argv and no shell interpolation on edited paths.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(resolve(root, "node_modules"))) process.exit(0);
const run = (bin, args) => {
  const result = spawnSync(process.execPath, [resolve(root, bin), ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 2);
};
if (process.argv.includes("--stop")) {
  run("node_modules/typescript/bin/tsc", ["--noEmit"]);
  run("node_modules/vitest/vitest.mjs", ["run"]);
} else {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }
  const file = input?.tool_input?.file_path;
  if (typeof file !== "string") process.exit(0);
  const absolute = resolve(root, file),
    rel = relative(root, absolute);
  if (rel.startsWith("..") || !existsSync(absolute)) process.exit(0);
  run("node_modules/prettier/bin/prettier.cjs", ["--write", "--ignore-unknown", absolute]);
  if (/\.(?:tsx?|jsx?)$/.test(absolute))
    run("node_modules/eslint/bin/eslint.js", ["--fix", absolute]);
}
