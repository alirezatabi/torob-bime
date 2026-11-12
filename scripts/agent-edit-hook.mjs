// Compatible agent environments: run the same checks on Windows, macOS, and Linux.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(resolve(root, "node_modules"))) {
  console.error("Install dependencies with npm install before verification.");
  process.exit(2);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
for (const script of ["typecheck", "lint"]) {
  const result = spawnSync(npm, ["run", script], {
    cwd: root,
    stdio: "inherit",
    // Windows executes npm through its .cmd shim; the arguments are fixed constants.
    shell: process.platform === "win32",
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(2);
}
