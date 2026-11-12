// Prisma's JS client engine uses @prisma/adapter-pg, not native engines. Prisma 6's
// generator still tries to download unused native binaries; bypass only for generate.
// Migrations continue to use Prisma's real schema engine and its normal download.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const env = {
  ...process.env,
  PRISMA_SCHEMA_ENGINE_BINARY: process.env.PRISMA_SCHEMA_ENGINE_BINARY || process.execPath,
  PRISMA_QUERY_ENGINE_LIBRARY: process.env.PRISMA_QUERY_ENGINE_LIBRARY || process.execPath,
};
// Invoke the local JS entry through Node directly: no shell or platform-specific .cmd shim.
// This also handles installation paths containing spaces on Windows.
const result = spawnSync(process.execPath, [prismaCli, "generate"], { env, stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
