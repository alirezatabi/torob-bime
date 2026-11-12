import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import samples from "@/fixtures/products.json";
import { extractSample } from "@/lib/ai/extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import { getPrisma } from "@/lib/data/prisma";
import { storeExtraction } from "@/lib/data/store-extraction";
import { carBodySchema } from "@/lib/schemas/car-body";
import { sampleProductInputSchema } from "@/lib/schemas/contracts";

test("inspector links two fields to their overlapping source quote", async ({ page, baseURL }) => {
  const database = process.env.TEST_DATABASE_URL;
  const host = new URL(baseURL!).hostname;
  test.skip(
    !database ||
      database !== process.env.DATABASE_URL ||
      !["localhost", "127.0.0.1"].includes(host),
    "requires the local server and a matching disposable TEST_DATABASE_URL",
  );
  const suffix = randomUUID().slice(0, 8);
  const input = sampleProductInputSchema.parse({
    ...samples[0],
    slug: `overlap-test-${suffix}`,
    insurerSlug: `overlap-insurer-${suffix}`,
  });
  const db = getPrisma();
  try {
    // Two individually valid fields deliberately share one longer exact quotation.
    const result = await extractSample(carBodySchema, input.sourceText);
    const collision = result.values.find((value) => value.fieldKey === "collision")!;
    const theft = result.values.find((value) => value.fieldKey === "total_theft")!;
    const quote = input.sourceText.slice(
      input.sourceText.indexOf(collision.evidence!),
      input.sourceText.indexOf(theft.evidence!) + theft.evidence!.length,
    );
    collision.evidence = quote;
    theft.evidence = quote;
    expect(
      groundExtraction({ values: result.values }, carBodySchema, input.sourceText).issues,
    ).toEqual([]);
    await storeExtraction(input, carBodySchema, result);

    await page.goto(`/compare/car-body/extraction/${input.slug}`);
    const first = page.getByRole("button", { name: /تصادف و برخورد.*اطمینان/ });
    const second = page.getByRole("button", { name: /سرقت کلی خودرو.*اطمینان/ });
    const shared = page.getByRole("button", { name: /در صورت تحقق شرایط این نمونه، تصادف/ });
    await first.focus();
    await expect(shared).toHaveAttribute("aria-pressed", "true");
    await shared.focus();
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(second).toHaveAttribute("aria-pressed", "true");
  } finally {
    await db.product.deleteMany({ where: { slug: input.slug } });
    await db.insurer.deleteMany({ where: { slug: input.insurerSlug } });
    await db.$disconnect();
  }
});
