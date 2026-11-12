import { defineConfig, devices } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    launchOptions: executablePath
      ? {
          executablePath,
          args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : undefined,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
