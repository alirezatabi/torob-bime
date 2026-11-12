import { expect, test } from "@playwright/test";

test("rapid Back before hydration restores the controls and keeps them interactive", async ({
  page,
}) => {
  await page.goto("/compare/car-body?required=minor_damage");
  const priority = page
    .getByRole("region", { name: "اولویت‌های مقایسه" })
    .getByRole("button", { name: "سرقت کلی خودرو", exact: true });
  await priority.click();
  await expect(page).toHaveURL(/priorities=total_theft/);
  await page
    .getByRole("region", { name: "طرح‌ها به ترتیب تناسب پوشش" })
    .locator("article")
    .first()
    .getByRole("button", { name: "حذف از مقایسه" })
    .click();
  await expect(page).toHaveURL(/compare=/);

  // Hold JavaScript only on reload: both Back operations then happen while the
  // server-rendered comparison is visible but React has not hydrated it yet.
  let releaseScripts = () => {};
  const scriptsBlocked = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  let intercepted = 0;
  await page.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async (route) => {
    intercepted++;
    await scriptsBlocked;
    await route.continue().catch(() => {});
  });
  try {
    await page.reload({ waitUntil: "commit" });
    await expect.poll(() => intercepted).toBeGreaterThan(0);
    await expect(priority).toHaveAttribute("aria-pressed", "true");
    await page.goBack({ waitUntil: "commit" });
    await expect(page).not.toHaveURL(/compare=/);
    await page.goBack({ waitUntil: "commit" });
    await expect(page).not.toHaveURL(/priorities=/);
  } finally {
    releaseScripts();
  }

  await expect(priority).toHaveAttribute("aria-pressed", "false", { timeout: 15_000 });
  await page.goForward();
  await expect(page).toHaveURL(/priorities=total_theft/);
  await expect(priority).toHaveAttribute("aria-pressed", "true");
  await priority.click();
  await expect(page).not.toHaveURL(/priorities=/);
  await expect(priority).toHaveAttribute("aria-pressed", "false");
});
