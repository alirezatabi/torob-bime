import { expect, test } from "@playwright/test";

test("model attribution is shown only for eligible sourced selections", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/explain", async (route) => {
    calls++;
    await route.fulfill({
      status: 200,
      json: {
        mode: "ai",
        items: [
          {
            productSlug: "car-body-sepehr",
            positiveFieldKey: "sample_premium",
            limitationFieldKey: "deductible",
          },
          {
            productSlug: "car-body-afagh",
            positiveFieldKey: "minor_damage",
            limitationFieldKey: "exclusions",
          },
        ],
      },
    });
  });
  await page.goto("/compare/car-body");
  await expect.poll(() => calls).toBe(1);
  const ranking = page.getByRole("region", { name: "طرح‌ها به ترتیب تناسب پوشش" });
  const accepted = ranking
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "طرح همراه" }) });
  await expect(accepted).toContainText("انتخاب برخی نکات با مدل");
  const first = ranking.locator("article").first();
  await expect(first).not.toContainText("انتخاب برخی نکات با مدل");
  const reason = first.getByRole("heading", { name: "یک معیار مؤثر در امتیاز" }).locator("..");
  await expect(reason).not.toContainText("حق‌بیمه");
  await expect(first).toContainText("روش استخراج: قانون‌محور (آفلاین)");
});

test("Back never displays model-selected facts for the previous priority state", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/explain", async (route) => {
    calls++;
    const request = route.request().postDataJSON() as { priorities: string[] };
    if (calls >= 3) await new Promise((resolve) => setTimeout(resolve, 1600));
    await route.fulfill({
      status: 200,
      json: {
        mode: "ai",
        items: [
          {
            productSlug: "car-body-sepehr",
            positiveFieldKey: request.priorities.includes("minor_damage")
              ? "minor_damage"
              : "total_theft",
            limitationFieldKey: "exclusions",
          },
        ],
      },
    });
  });
  await page.goto("/compare/car-body");
  const card = page
    .getByRole("region", { name: "طرح‌ها به ترتیب تناسب پوشش" })
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "طرح کامل" }) });
  await expect(card).toContainText("انتخاب برخی نکات با مدل");
  await page
    .getByRole("region", { name: "اولویت‌های مقایسه" })
    .getByRole("button", { name: "خسارت جزئی و خط‌وخش", exact: true })
    .click();
  await expect(card).toContainText("انتخاب برخی نکات با مدل");
  await expect(
    card.getByRole("heading", { name: "یک معیار مؤثر در امتیاز" }).locator(".."),
  ).toContainText("خسارت جزئی و خط‌وخش");
  await expect.poll(() => calls).toBe(2);
  await page.goBack();
  await expect(page).not.toHaveURL(/priorities=/);
  await expect(card).not.toContainText("انتخاب برخی نکات با مدل");
  await expect.poll(() => calls).toBe(3);
  await expect(card).not.toContainText("انتخاب برخی نکات با مدل");
  await expect(card).toContainText("انتخاب برخی نکات با مدل", { timeout: 5000 });
});
