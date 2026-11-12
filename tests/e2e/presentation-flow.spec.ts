import { expect, test } from "@playwright/test";

test("the first screen states the comparison purpose and fictional-data limitation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("مقایسه بیمه");
  await expect(page.getByText(/شرکت‌ها، طرح‌ها و حق‌بیمه‌ها در این نسخه ساختگی‌اند/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "نیاز بیمه‌ای خود را بنویسید" })).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`comparison shortcuts reveal the target without hiding it behind the header at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/compare/car-body?priorities=minor_damage,total_theft");
    const header = page.locator('div[class*="md:sticky"]').first();
    await expect(header).toHaveCSS("position", width < 768 ? "relative" : "sticky");
    const nav = page.getByRole("navigation", { name: "دسترسی سریع به بخش‌های مقایسه" });
    await nav.getByRole("link", { name: "بدون پوشش" }).click();
    await expect(page).toHaveURL(/#non-coverage$/);
    const heading = page.getByRole("heading", { name: "چه چیزهایی تحت پوشش نیست؟" });
    await expect(heading).toBeInViewport();
    const bounds = await heading.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    if (width >= 768) {
      const sticky = await header.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(sticky!.y + sticky!.height);
    } else {
      await page.getByRole("link", { name: /مقایسه \(۴\)/ }).click();
      await expect(page).toHaveURL(/#comparison-details$/);
      await expect(page.getByRole("heading", { name: "جدول مقایسه پوشش‌ها" })).toBeInViewport();
    }
  });
}

test("mobile identical-row count describes the displayed pair rather than all selected plans", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compare/car-body");
  const table = page.getByRole("table", { name: /مقایسه پوشش‌های/ });
  const checkbox = page.getByRole("checkbox", { name: /پنهان‌کردن ردیف‌های مشابه/ });
  async function checkCount() {
    const rows = table.getByRole("rowheader");
    const identical = (await rows.count()) - (await rows.filter({ hasText: "متفاوت" }).count());
    const number = new Intl.NumberFormat("fa-IR").format(identical);
    await expect(checkbox).toHaveAccessibleName(`پنهان‌کردن ردیف‌های مشابه (${number})`);
  }
  await checkCount();
  await page.getByRole("combobox", { name: "انتخاب طرح اول" }).click();
  await page.getByRole("option", { name: /طرح پایه/ }).click();
  await checkCount();
});

test("the search continuation announces when the comparison is still loading", async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let blocked = 0;
  await page.route("**/compare/car-body?*", async (route) => {
    if (route.request().url().includes("intent=")) {
      blocked++;
      await pending;
    }
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "خسارت جزئی خودرو" }).click();
    await page.getByRole("button", { name: "جست‌وجو و مقایسه" }).click();
    const confirmation = page.getByRole("region", { name: "تأیید برداشت از نیاز" });
    await confirmation.getByRole("button", { name: "ادامه به مقایسه" }).click();
    await expect.poll(() => blocked).toBeGreaterThan(0);
    const button = confirmation.getByRole("button", { name: "در حال آماده‌سازی مقایسه..." });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(confirmation.getByRole("status")).toHaveText("در حال آماده‌سازی مقایسه");
  } finally {
    release();
  }
  await expect(page).toHaveURL(/\/compare\/car-body/);
  await expect(page.getByRole("heading", { name: "بیمه بدنه خودرو", level: 1 })).toBeVisible();
});

test("a category link reports its pending comparison navigation", async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let blocked = 0;
  await page.route("**/compare/travel*", async (route) => {
    if (route.request().resourceType() === "fetch") {
      blocked++;
      await pending;
    }
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/");
    const link = page.getByRole("link", { name: /بیمه مسافرتی/ }).first();
    await link.click();
    await expect.poll(() => blocked).toBeGreaterThan(0);
    await expect(link.getByRole("status")).toContainText("در حال آماده‌سازی مقایسه");
  } finally {
    release();
  }
  await expect(page).toHaveURL(/\/compare\/travel/);
  await expect(page.getByRole("heading", { name: "بیمه مسافرتی", level: 1 })).toBeVisible();
});

test("comparison state changes preserve the current section in the shareable URL", async ({
  page,
}) => {
  await page.goto("/compare/car-body#plans");
  const priority = page
    .getByRole("region", { name: "اولویت‌های مقایسه" })
    .getByRole("button", { name: "سرقت کلی خودرو", exact: true });
  await priority.click();
  await expect(page).toHaveURL(/priorities=total_theft#plans$/);
  await expect(priority).toHaveAttribute("aria-pressed", "true");
});
