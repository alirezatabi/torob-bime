import { loadEnvConfig } from "@next/env";
// Identical precedence to Next.js: .env.local, .env, etc.; never log loaded values.
loadEnvConfig(process.cwd());
