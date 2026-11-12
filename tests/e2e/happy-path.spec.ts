import { test, expect } from "@playwright/test";

test("Persian need to ranked comparison, limitations, and exact source", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page
    .getByRole("textbox", { name: "نیاز بیمه‌ای خود را بنویسید" })
    .fill("ماشین نو خریدم و نگران تصادف جزئی‌ام");
  await page.getByRole("button", { name: "جست‌وجو و مقایسه" }).click();
  await expect(page.getByRole("region", { name: "تأیید برداشت از نیاز" })).toBeVisible();
  await page.getByRole("button", { name: "ادامه به مقایسه" }).click();
  await expect(page).toHaveURL(/\/compare\/car-body/);
  await expect(page.getByRole("heading", { name: "بیمه بدنه خودرو", level: 1 })).toBeVisible();
  await expect(page.getByText("داده‌های نمونه و ساختگی:")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "خسارت جزئی و خط‌وخش", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const limits = page.getByRole("region", { name: "چه چیزهایی تحت پوشش نیست؟" });
  await expect(limits).toBeVisible();
  await limits
    .getByRole("button", { name: /نمایش منبع/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("نقل‌قول دقیق از متن نمونه")).toBeVisible();
  await expect(dialog.locator("blockquote")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByLabel(/پنهان‌کردن ردیف‌های مشابه/).check();
  await expect(page.getByRole("rowheader", { name: "تصادف و برخورد" })).toHaveCount(0);
});

test("ambiguous need asks one clarifying question", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "نیاز بیمه‌ای خود را بنویسید" })
    .fill("یک بیمه خوب می‌خواهم");
  await page.getByRole("button", { name: "جست‌وجو و مقایسه" }).click();
  await expect(page.getByText("دنبال کدام نوع بیمه هستید؟")).toBeVisible();
  await page.getByRole("button", { name: "بیمه مسافرتی" }).click();
  await page.getByRole("button", { name: "ادامه به مقایسه" }).click();
  await expect(page).toHaveURL(/\/compare\/travel/);
});

test("explicit coverage requirements affect the ordering and can be removed", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "نیاز بیمه‌ای خود را بنویسید" })
    .fill("برای ماشین بیمه بدنه می‌خواهم، حتما خط و خش پوشش داشته باشد");
  await page.getByRole("button", { name: "جست‌وجو و مقایسه" }).click();
  await page.getByRole("button", { name: "ادامه به مقایسه" }).click();
  await expect(page).toHaveURL(/required=minor_damage/);
  const requirements = page.getByRole("region", { name: "شرط‌های الزامی پوشش" });
  await expect(requirements).toBeVisible();
  const ranking = page.locator("section").filter({
    has: page.getByRole("heading", { name: "طرح‌ها به ترتیب تناسب پوشش" }),
  });
  await expect(ranking.locator("article").first()).toContainText("۱ از ۱ شرط تأیید شده");
  await requirements.getByRole("button", { name: "حذف شرط خسارت جزئی و خط‌وخش" }).click();
  await expect(requirements).toHaveCount(0);
});

test("unknown and roadmap categories return HTTP 404", async ({ request }) => {
  expect((await request.get("/compare/unknown")).status()).toBe(404);
  expect((await request.get("/compare/pet")).status()).toBe(404);
});

test("mobile layout stays in viewport and comparison table scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compare/travel");
  await expect(page.getByRole("heading", { name: "بیمه مسافرتی", level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const table = page.getByRole("table", { name: /مقایسه پوشش‌های/ });
  await expect(table).toBeVisible();
  expect(await table.evaluate((element) => element.scrollWidth)).toBeGreaterThan(390);
});
