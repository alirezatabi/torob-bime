import { test, expect } from "@playwright/test";

test("Enter submits only outside IME; confirmation is editable before navigation", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "نیاز بیمه‌ای خود را بنویسید" });
  await input.fill("برای سفر شنگن بیمه با پوشش درمان می‌خواهم");
  await input.dispatchEvent("keydown", { key: "Enter", isComposing: true, bubbles: true });
  await expect(page.getByRole("region", { name: "تأیید برداشت از نیاز" })).toHaveCount(0);
  await input.press("Shift+Enter");
  expect(await input.inputValue()).toContain("\n");
  await input.press("Enter");
  const confirmation = page.getByRole("region", { name: "تأیید برداشت از نیاز" });
  await expect(confirmation).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(confirmation.getByLabel("نوع بیمه")).toHaveValue("travel");
  await confirmation
    .getByRole("button", { name: /حذف اولویت/ })
    .first()
    .click();
  await confirmation.getByRole("button", { name: "ادامه به مقایسه" }).click();
  await expect(page).toHaveURL(/\/compare\/travel/);
});

test("comparison URL persists priority, required coverage and selected plans; Back restores state", async ({
  page,
}) => {
  await page.goto("/compare/car-body?required=minor_damage&budget=0");
  await expect(page.getByText("بودجه ۰ تومان")).toHaveCount(0);
  const choice = page
    .getByRole("region", { name: "اولویت‌های مقایسه" })
    .getByRole("button", { name: "سرقت کلی خودرو", exact: true });
  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/priorities=total_theft/);
  const ranking = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "طرح‌ها به ترتیب تناسب پوشش" }) });
  await ranking.locator("article").first().getByRole("button", { name: "حذف از مقایسه" }).click();
  await expect(page).toHaveURL(/compare=/);
  const customized = page.url();
  await page.reload();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.get("compare")?.split(",")).toHaveLength(3);
  await page.goBack();
  await expect(page).not.toHaveURL(customized);
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  // Consecutive history transitions must not leave React state behind the URL.
  await page.goBack();
  await expect(page).not.toHaveURL(/priorities=/);
  await expect(choice).toHaveAttribute("aria-pressed", "false");
  await page.goForward();
  await expect(page).toHaveURL(/priorities=total_theft/);
  await expect(choice).toHaveAttribute("aria-pressed", "true");
});

test("mobile navigation, theme persistence and 360–1280 layouts", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "بازکردن منو" }).click();
  await expect(page.getByRole("navigation", { name: "ناوبری موبایل" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "ناوبری موبایل" })
    .getByRole("link", { name: "ارزیابی" })
    .click();
  await expect(page).toHaveURL(/\/evaluation/);
  await page.getByRole("button", { name: "فعال‌کردن حالت تیره" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const width of [360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/compare/car-body", "/roadmap"]) {
      await page.goto(path);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${path} ${width}`,
      ).toBeLessThanOrEqual(width);
    }
  }
});

test("behind the scenes links source spans to fields and exposes provenance", async ({ page }) => {
  await page.goto("/compare/car-body/extraction/car-body-aftab");
  await expect(page.getByRole("heading", { name: "از متن تا پوشش‌های قابل بررسی" })).toBeVisible();
  await expect(page.getByText("قانون‌محور (آفلاین)")).toBeVisible();
  const field = page.getByRole("button", { name: /تصادف و برخورد.*اطمینان/ });
  await field.focus();
  await expect(field).toHaveAttribute("aria-pressed", "true");
  const quote = page.getByRole("button", { name: /در صورت تحقق شرایط این نمونه، تصادف/ });
  await expect(quote).toHaveAttribute("aria-pressed", "true");
});

test("budget flags only fictional annual premiums", async ({ page }) => {
  await page.goto("/compare/car-body?budget=10000000");
  await expect(page.getByText("در محدوده بودجه نمونه").first()).toBeVisible();
  await expect(page.getByText("بیشتر از بودجه نمونه").first()).toBeVisible();
  await expect(page.getByText("حق‌بیمه سالانه نمونه، قیمت واقعی نیست").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "پوشش در برابر حق‌بیمه نمونه" })).toBeVisible();
});
