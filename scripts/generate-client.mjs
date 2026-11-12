// Prisma's JS client engine uses @prisma/adapter-pg, not native engines. Prisma 6's
// generator still tries to download unused native binaries; bypass only for generate.
// Migrations continue to use Prisma's real schema engine and its normal download.
import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  PRISMA_SCHEMA_ENGINE_BINARY: process.env.PRISMA_SCHEMA_ENGINE_BINARY || process.execPath,
  PRISMA_QUERY_ENGINE_LIBRARY: process.env.PRISMA_QUERY_ENGINE_LIBRARY || process.execPath,
};
const result = spawnSync("pnpm", ["exec", "prisma", "generate"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
