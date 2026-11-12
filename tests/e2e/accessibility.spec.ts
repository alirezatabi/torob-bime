import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
for (const theme of ["light", "dark"] as const)
  for (const width of [390, 1280]) {
    test(`${theme} at ${width}: routes and evidence drawer have no automatically detectable WCAG violations`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((value) => localStorage.setItem("torob-theme", value), theme);
      for (const path of [
        "/",
        "/compare/car-body",
        "/compare/supplementary-health",
        "/compare/travel",
        "/evaluation",
        "/roadmap",
        "/compare/car-body/extraction/car-body-aftab",
      ]) {
        await page.goto(path);
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations, `${theme} ${width} ${path}`).toEqual([]);
        const tinyText = await page.evaluate(() =>
          Array.from(document.querySelectorAll("body *"))
            .filter((element) => {
              const hasText = Array.from(element.childNodes).some(
                (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
              );
              const style = getComputedStyle(element);
              return (
                hasText &&
                element.getClientRects().length > 0 &&
                style.visibility !== "hidden" &&
                Number.parseFloat(style.fontSize) < 13
              );
            })
            .map((element) => `${element.tagName}: ${element.textContent?.trim().slice(0, 60)}`),
        );
        expect(tinyText, `${theme} ${width} ${path} visible text below 13px`).toEqual([]);
      }
      await page.goto("/compare/travel?required=baggage_delay");
      await page
        .getByRole("region", { name: "چه چیزهایی تحت پوشش نیست؟" })
        .getByRole("button", { name: /نمایش منبع/ })
        .first()
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    });
  }
