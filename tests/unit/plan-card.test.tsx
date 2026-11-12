import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import samples from "@/fixtures/products.json";
import { PlanCard } from "@/components/plan-card";
import { rankProducts } from "@/lib/domain/ranking";
import { carBodySchema } from "@/lib/schemas/car-body";

it("does not invent a score reason, non-coverage or model attribution for unknown data", () => {
  const { sourceText, ...data } = samples[0];
  void sourceText;
  const product = { ...data, coverages: [] };
  const ranked = rankProducts([product], carBodySchema, ["minor_damage"])[0];
  const html = renderToStaticMarkup(
    <PlanCard
      ranked={ranked}
      products={[product]}
      index={0}
      schema={carBodySchema}
      priorities={["minor_damage"]}
      selected={false}
      selectionCount={2}
      budget={null}
      onToggle={() => {}}
      onSource={() => {}}
      suggestion={{
        mode: "ai",
        positiveFieldKey: "sample_premium",
        limitationFieldKey: "minor_damage",
      }}
    />,
  );
  expect(html).toContain("معیار مستندی با سهم مثبت در امتیاز ثبت نشده است");
  expect(html).toContain("مورد صریحی از نبود پوشش ثبت نشده");
  expect(html).not.toContain("انتخاب برخی نکات با مدل");
  expect(html).not.toContain("نمایش منبع");
});
