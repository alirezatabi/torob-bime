// Reproducible visual evidence: start a seeded server first, then run
// PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 node scripts/capture-screenshots.mjs
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const output = process.env.SCREENSHOT_DIR || "docs/screenshots";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const pages = [
  ["home", "/"],
  ["car", "/compare/car-body"],
  ["health", "/compare/supplementary-health"],
  ["travel", "/compare/travel"],
  ["evaluation", "/evaluation"],
  ["roadmap", "/roadmap"],
  ["inspector", "/compare/car-body/extraction/car-body-aftab"],
  ["evidence", "/compare/travel?required=baggage_delay"],
];
try {
  for (const theme of ["light", "dark"]) {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      await context.addInitScript((value) => localStorage.setItem("torob-theme", value), theme);
      const page = await context.newPage();
      for (const [name, url] of pages) {
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        if (name === "evidence") {
          await page
            .getByRole("region", { name: "چه چیزهایی تحت پوشش نیست؟" })
            .getByRole("button", { name: /نمایش منبع/ })
            .first()
            .click();
          await page.getByRole("dialog").waitFor();
        }
        const file = path.join(output, `${name}-${theme}-${width}.jpg`);
        await page.screenshot({
          path: file,
          type: "jpeg",
          quality: 65,
          fullPage: name !== "evidence",
          animations: "disabled",
        });
        console.log(file);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
