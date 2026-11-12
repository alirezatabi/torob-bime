import { expect, test } from "@playwright/test";

test("a ranked plan shows an actual weighted criterion, a non-coverage and their sources", async ({
  page,
}) => {
  await page.goto("/compare/car-body?priorities=minor_damage");
  const ranking = page.getByRole("region", { name: "طرح‌ها به ترتیب تناسب پوشش" });
  const first = ranking.locator("article").first();
  await expect(first.getByRole("heading", { name: "طرح کامل" })).toBeVisible();
  await expect(first).toContainText("امتیاز پوشش:");
  await expect(first).toContainText("نسبی به طرح‌های این صفحه");
  const reason = first.getByRole("heading", { name: "یک معیار مؤثر در امتیاز" }).locator("..");
  await expect(reason).toContainText("خسارت جزئی و خط‌وخش: دارد");
  await expect(reason).toContainText("وزن ۳ برابر");
  await reason.getByRole("button", { name: /نمایش منبع خسارت جزئی/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("نقل‌قول دقیق از متن نمونه");
  await expect(dialog.locator("blockquote")).toContainText("خسارت جزئی و خط‌وخش");
  await page.keyboard.press("Escape");

  const exclusion = first
    .getByRole("heading", { name: "چه چیزی پوشش داده نمی‌شود؟" })
    .locator("..");
  await expect(exclusion).toContainText("مسابقات اتومبیل‌رانی");
  await exclusion.getByRole("button", { name: /نمایش منبع استثنای مهم/ }).click();
  await expect(dialog.locator("blockquote")).toContainText("مسابقات اتومبیل‌رانی");
  await page.keyboard.press("Escape");

  const noMinorDamage = ranking
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "طرح آسوده" }) });
  const itsReason = noMinorDamage
    .getByRole("heading", { name: "یک معیار مؤثر در امتیاز" })
    .locator("..");
  await expect(itsReason).not.toContainText("خسارت جزئی و خط‌وخش");
  const itsExclusion = noMinorDamage
    .getByRole("heading", { name: "چه چیزی پوشش داده نمی‌شود؟" })
    .locator("..");
  await expect(itsExclusion).toContainText("خسارت جزئی و خط‌وخش: ندارد");
  await expect(first).toContainText("روش استخراج: قانون‌محور (آفلاین)");
  await expect(first).not.toContainText("انتخاب برخی نکات با مدل");
});
