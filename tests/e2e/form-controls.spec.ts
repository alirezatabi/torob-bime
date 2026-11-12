import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("search validation is associated with the visible field and clears on editing", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "نیاز بیمه‌ای خود را بنویسید" });
  await expect(page.getByText("نیاز بیمه‌ای خود را بنویسید", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "جست‌وجو و مقایسه" }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute("aria-describedby", /insurance-need-error/);
  await expect(page.locator("#insurance-need-error")).toContainText("بیشتر توضیح دهید");
  await input.fill("شماره ۰۹۱۲۱۲۳۴۵۶۷ برای بیمه ماشین");
  await page.getByRole("button", { name: "جست‌وجو و مقایسه" }).click();
  await expect(page.locator("#insurance-need-error")).toContainText("شماره تماس");
  await input.fill("برای خودرو بیمه بدنه با پوشش خسارت جزئی می‌خواهم");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#insurance-need-error")).toHaveCount(0);
});

test("insurance type dropdown supports keyboard selection, cancellation and focus return", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "خسارت جزئی خودرو" }).click();
  await page.getByRole("button", { name: "جست‌وجو و مقایسه" }).click();
  const confirmation = page.getByRole("region", { name: "تأیید برداشت از نیاز" });
  const select = confirmation.getByRole("combobox", { name: "نوع بیمه" });
  await expect(select).toContainText("بیمه بدنه خودرو");
  await select.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("listbox");
  await expect(menu).toBeVisible();
  await expect(page.locator("#intent-type")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#app-shell")).toHaveAttribute("inert", "");
  await expect(menu.getByRole("option")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(select).toBeFocused();
  await expect(select).toContainText("بیمه بدنه خودرو");
  await page.keyboard.press("Enter");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("option", { name: "بیمه بدنه خودرو" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu.getByRole("option", { name: "بیمه مسافرتی" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(select).toContainText("بیمه مسافرتی");
  await expect(confirmation.getByRole("button", { name: /حذف اولویت/ })).toHaveCount(0);
  await confirmation.getByRole("button", { name: "ادامه به مقایسه" }).click();
  await expect(page).toHaveURL(/\/compare\/travel/);
});

test("budget accepts Persian digits, announces errors and can be cleared", async ({ page }) => {
  await page.goto("/compare/car-body");
  const input = page.getByRole("textbox", { name: /بودجه سالانه برای مقایسه نمونه/ });
  await expect(input).toHaveAttribute("inputmode", "numeric");
  await input.fill("عدد نادرست");
  await page.getByRole("button", { name: "اعمال بودجه" }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute("aria-describedby", /budget-error/);
  await expect(page.locator("#budget-error")).toContainText("بزرگ‌تر از صفر");
  await input.fill("۱۰٬۰۰۰٬۰۰۰");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "اعمال بودجه" }).click();
  await expect(page).toHaveURL(/budget=10000000/);
  await expect(page.getByText("در محدوده بودجه نمونه").first()).toBeVisible();
  await page.getByRole("button", { name: "حذف بودجه" }).click();
  await expect(page).not.toHaveURL(/budget=/);
  await expect(input).toBeEmpty();
});

test("checkbox remains native and operable by keyboard", async ({ page }) => {
  await page.goto("/compare/car-body");
  const checkbox = page.getByRole("checkbox", { name: /پنهان‌کردن ردیف‌های مشابه/ });
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(page.getByRole("rowheader", { name: "تصادف و برخورد" })).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(checkbox).not.toBeChecked();
});

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: the mobile dropdown is within the viewport and passes axe when open`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((value) => localStorage.setItem("torob-theme", value), theme);
    await page.goto("/compare/car-body");
    const select = page.getByRole("combobox", { name: "انتخاب طرح اول" });
    await select.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(select).toBeFocused();
  });
}
