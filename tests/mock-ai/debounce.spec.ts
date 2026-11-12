import { expect, test } from "@playwright/test";

test("five rapid priority toggles send at most one debounced explanation request", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/explain", async (route) => {
    calls++;
    await route.fulfill({ status: 200, json: { mode: "ai", items: [] } });
  });
  await page.goto("/compare/car-body");
  await expect.poll(() => calls).toBe(1); // Initial render, before interaction.
  calls = 0;
  const priorityRegion = page.getByRole("region", { name: "اولویت‌های مقایسه" });
  await priorityRegion.evaluate((region) => {
    const buttons = Array.from(region.querySelectorAll<HTMLButtonElement>("button"));
    if (buttons.length < 5) throw new Error("Expected at least five priority controls");
    buttons.slice(0, 5).forEach((button) => button.click());
  });
  await expect.poll(() => calls, { timeout: 3000 }).toBe(1);
  // Wait beyond the 500ms debounce interval to catch a delayed duplicate.
  await page.waitForTimeout(700);
  expect(calls).toBe(1);
});
