import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ComparisonTable } from "@/components/comparison-table";
import sample from "@/fixtures/products.json";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import { rankProducts } from "@/lib/domain/ranking";
import { carBodySchema } from "@/lib/schemas/car-body";

it("explains an unknown value without presenting it as an exclusion", () => {
  const { sourceText, ...data } = sample[0];
  const coverages = groundExtraction(
    extractOffline(carBodySchema, sourceText),
    carBodySchema,
    sourceText,
  ).values;
  const known = { ...data, coverages };
  const unknown = {
    ...known,
    slug: "unknown",
    coverages: coverages.map((coverage) =>
      coverage.fieldKey === "collision"
        ? { ...coverage, value: null, evidence: null, confidence: 0 }
        : coverage,
    ),
  };
  const compared = rankProducts([known, unknown], carBodySchema, []);
  const html = renderToStaticMarkup(
    <ComparisonTable
      schema={carBodySchema}
      compared={compared}
      rows={carBodySchema.fields.map((field) => ({ field, differs: true }))}
      hideIdentical={false}
      setHideIdentical={() => {}}
      onToggle={() => {}}
      onSource={() => {}}
    />,
  );
  expect(html).toContain("نامشخص");
  expect(html).toContain("چرا تصادف و برخورد");
  expect(html).toContain("نامشخص به معنی نداشتن پوشش");
  expect(html).toContain("<details");
});

it("renders an ungrounded non-null value as unknown, not as a sourced coverage", () => {
  const { sourceText, ...data } = sample[0];
  const coverages = groundExtraction(
    extractOffline(carBodySchema, sourceText),
    carBodySchema,
    sourceText,
  ).values;
  const known = { ...data, coverages };
  const ungrounded = {
    ...known,
    slug: "ungrounded",
    nameFa: "طرح بی‌شاهد",
    coverages: coverages.map((coverage) =>
      coverage.fieldKey === "collision" ? { ...coverage, value: false, evidence: null } : coverage,
    ),
  };
  const compared = rankProducts([known, ungrounded], carBodySchema, []);
  const html = renderToStaticMarkup(
    <ComparisonTable
      schema={carBodySchema}
      compared={compared}
      rows={carBodySchema.fields.map((field) => ({ field, differs: true }))}
      hideIdentical={false}
      setHideIdentical={() => {}}
      onToggle={() => {}}
      onSource={() => {}}
    />,
  );
  expect(html).toContain("چرا تصادف و برخورد در طرح بی‌شاهد");
  expect(html).not.toContain("نمایش منبع تصادف و برخورد در طرح بی‌شاهد");
});

it("reserves 160px per plan and a 180px label column for six plans", () => {
  const { sourceText, ...data } = sample[0];
  const coverages = groundExtraction(
    extractOffline(carBodySchema, sourceText),
    carBodySchema,
    sourceText,
  ).values;
  const products = Array.from({ length: 6 }, (_, index) => ({
    ...data,
    slug: `test-${index}`,
    nameFa: `طرح ${index + 1}`,
    coverages,
  }));
  const compared = rankProducts(products, carBodySchema, []);
  const html = renderToStaticMarkup(
    <ComparisonTable
      schema={carBodySchema}
      compared={compared}
      rows={carBodySchema.fields.map((field) => ({ field, differs: false }))}
      hideIdentical={false}
      setHideIdentical={() => {}}
      onToggle={() => {}}
      onSource={() => {}}
    />,
  );
  expect(html).toContain("min-width:1140px");
  expect(html).toContain("min-width:500px"); // Two-plan mobile view.
  expect(html).toContain("sticky start-0 top-0");
  expect(html).toContain("حذف طرح 6");
});
