import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma CLI and the application use the same .env.local/.env precedence.
loadEnvConfig(process.cwd());
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
});
