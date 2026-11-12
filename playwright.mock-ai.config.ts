import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Isolated server with dummy credentials; every explanation request is intercepted
// by the test, so this suite must never call a real model or spend API credits.
export default defineConfig({
  ...base,
  testDir: "./tests/mock-ai",
  use: { ...base.use, baseURL: "http://127.0.0.1:3002" },
  webServer: {
    command: "npm run start -- -p 3002",
    url: "http://127.0.0.1:3002",
    env: { ANTHROPIC_API_KEY: "mock-only-not-a-real-key", LLM_MODEL: "mock-model" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
