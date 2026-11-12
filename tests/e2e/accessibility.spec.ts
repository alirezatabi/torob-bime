import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("home and evaluation have no automatically detectable WCAG violations", async ({ page }) => {
  for (const path of ["/", "/evaluation"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(result.violations, path).toEqual([]);
  }
});

test("mobile comparison and source dialog have no automatically detectable WCAG violations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compare/travel?required=baggage_delay");
  await expect(page.getByRole("region", { name: "شرط‌های الزامی پوشش" })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  await page
    .getByRole("region", { name: "چه چیزهایی تحت پوشش نیست؟" })
    .getByRole("button", { name: /نمایش منبع/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
});
