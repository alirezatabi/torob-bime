"use client";
import { useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { faNumber, formatValue } from "@/lib/domain/format";
import { getCoverage, relativeFieldScore, type RankedProduct } from "@/lib/domain/ranking";
import type { CoverageField, InsuranceSchema } from "@/lib/schemas/contracts";
import { EvidenceButton, type SourceHandler } from "./evidence-button";
import { IconButton } from "./ui/button";
import { Checkbox, FieldLabel, SelectInput } from "./ui/field";
import { Tooltip } from "./ui/surfaces";

type Row = { field: CoverageField; differs: boolean };
type Props = {
  schema: InsuranceSchema;
  compared: RankedProduct[];
  rows: Row[];
  hideIdentical: boolean;
  setHideIdentical: (value: boolean) => void;
  onToggle: (slug: string) => void;
  onSource: SourceHandler;
};
function Table({
  compared,
  rows,
  onToggle,
  onSource,
  hideIdentical,
  selectionCount,
}: Pick<Props, "compared" | "rows" | "onToggle" | "onSource" | "hideIdentical"> & {
  selectionCount: number;
}) {
  const displayedRows = rows
    .map(({ field }) => ({
      field,
      differs:
        new Set(
          compared.map(({ product }) =>
            JSON.stringify(getCoverage(product, field.key)?.value ?? null),
          ),
        ).size > 1,
    }))
    .filter((row) => !hideIdentical || row.differs);
  const groups = new Map<string, Row[]>();
  for (const row of displayedRows) {
    const group = row.field.group ?? "سایر شرایط";
    groups.set(group, [...(groups.get(group) ?? []), row]);
  }
  const products = compared.map(({ product }) => product);
  return (
    <div className="scrollbar-thin max-h-[72vh] overflow-auto rounded-2xl border border-border bg-surface-raised">
      <table
        className="w-full table-fixed border-collapse text-start"
        style={{ minWidth: `${180 + compared.length * 160}px` }}
      >
        <caption className="sr-only">
          مقایسه پوشش‌های طرح‌های انتخاب‌شده. ردیف‌های متفاوت مشخص شده‌اند.
        </caption>
        <colgroup>
          <col style={{ width: 180 }} />
          {compared.map(({ product }) => (
            <col key={product.slug} style={{ width: 160 }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky start-0 top-0 z-30 border-b border-e border-border bg-surface-muted p-4 text-start text-xs font-bold text-text-muted"
            >
              پوشش / شرایط
            </th>
            {compared.map(({ product }) => (
              <th
                key={product.slug}
                scope="col"
                className="sticky top-0 z-20 border-b border-border bg-surface-muted p-3 text-start"
              >
                <div className="flex items-start justify-between gap-1">
                  <span>
                    <span className="block text-xs font-extrabold">{product.nameFa}</span>
                    <span className="mt-1 block text-xs font-normal text-text-muted">
                      {product.insurerNameFa}
                    </span>
                  </span>
                  <IconButton
                    label={`حذف ${product.nameFa}، ${product.insurerNameFa} از مقایسه`}
                    disabled={selectionCount <= 2}
                    onClick={() => onToggle(product.slug)}
                  >
                    <X size={17} aria-hidden="true" />
                  </IconButton>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...groups].map(([group, members]) => (
            <Group
              key={group}
              group={group}
              rows={members}
              products={products}
              compared={compared}
              onSource={onSource}
            />
          ))}
        </tbody>
      </table>
      {displayedRows.length === 0 && (
        <p className="p-6 text-center text-sm text-text-muted">
          در طرح‌های انتخاب‌شده ردیف متفاوتی وجود ندارد.
        </p>
      )}
    </div>
  );
}
function Group({
  group,
  rows,
  products,
  compared,
  onSource,
}: {
  group: string;
  rows: Row[];
  products: RankedProduct["product"][];
  compared: RankedProduct[];
  onSource: SourceHandler;
}) {
  return (
    <>
      {
        <tr>
          <th
            colSpan={compared.length + 1}
            scope="colgroup"
            className="border-b border-border bg-surface-muted px-4 py-3 text-start text-xs font-extrabold text-text"
          >
            {group}
          </th>
        </tr>
      }
      {rows.map(({ field, differs }) => {
        const knownValues = products
          .map((product) => getCoverage(product, field.key)?.value ?? null)
          .filter((value) => value !== null);
        const hasComparison =
          knownValues.length >= 2 &&
          new Set(knownValues.map((value) => JSON.stringify(value))).size > 1;
        return (
          <tr key={field.key} className={differs ? "bg-warning-soft" : "bg-surface-raised"}>
            <th
              scope="row"
              className={`sticky start-0 z-10 border-b border-e border-border p-4 text-start align-top ${differs ? "bg-warning-soft" : "bg-surface-raised"}`}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold leading-6">{field.labelFa}</span>
                {field.glossaryFa && (
                  <Tooltip label={`توضیح ${field.labelFa}`}>{field.glossaryFa}</Tooltip>
                )}
              </div>
              {differs && (
                <span className="mt-1 inline-block rounded-lg bg-surface-raised px-2 py-1 text-xs font-bold text-warning">
                  متفاوت
                </span>
              )}
            </th>
            {compared.map(({ product }) => {
              const coverage = getCoverage(product, field.key);
              const value = coverage?.value ?? null;
              const isBest =
                hasComparison &&
                !field.isExclusion &&
                field.kind !== "text" &&
                relativeFieldScore(product, field, products) === 1;
              return (
                <td
                  key={product.slug}
                  className="border-b border-border p-3 align-top text-xs leading-6"
                >
                  <div className="flex items-start gap-1.5">
                    {value === true ? (
                      <Check size={16} className="mt-1 shrink-0 text-success" aria-hidden="true" />
                    ) : value === false ? (
                      <X size={16} className="mt-1 shrink-0 text-danger" aria-hidden="true" />
                    ) : value === null ? (
                      <Minus
                        size={16}
                        className="mt-1 shrink-0 text-text-muted"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span>{formatValue(field, value)}</span>
                  </div>
                  {isBest && (
                    <span className="mt-1 inline-block rounded-lg bg-success-soft px-2 py-1 text-xs font-bold text-success">
                      بهترین
                    </span>
                  )}
                  {value === null && (
                    <Tooltip
                      label={`چرا ${field.labelFa} در ${product.nameFa}، ${product.insurerNameFa} نامشخص است؟`}
                    >
                      در متن نمونه شاهد کافی برای این مقدار پیدا نشده است؛ نامشخص به معنی نداشتن
                      پوشش نیست.
                    </Tooltip>
                  )}
                  <EvidenceButton
                    product={product}
                    field={field}
                    coverage={coverage}
                    onSource={onSource}
                  />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
export function ComparisonTable({
  schema,
  compared,
  rows,
  hideIdentical,
  setHideIdentical,
  onToggle,
  onSource,
}: Props) {
  const [pair, setPair] = useState<[string, string]>([
    compared[0]?.product.slug ?? "",
    compared[1]?.product.slug ?? "",
  ]);
  const a = compared.find((item) => item.product.slug === pair[0]) ?? compared[0];
  const b =
    compared.find(
      (item) => item.product.slug === pair[1] && item.product.slug !== a?.product.slug,
    ) ?? compared.find((item) => item.product.slug !== a?.product.slug);
  const mobile = [a, b].filter((item): item is RankedProduct => Boolean(item));
  const identical = schema.fields.length - rows.filter((row) => row.differs).length;
  return (
    <section aria-labelledby="table-title" className="mt-12 scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-brand-strong">جزئیات، کنار هم</p>
          <h2 id="table-title" className="mt-1 text-2xl font-extrabold">
            جدول مقایسه پوشش‌ها
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            ردیف‌های متفاوت مشخص شده‌اند؛ برای بررسی هر مقدار، منبع آن را باز کنید.
          </p>
        </div>
        <Checkbox
          checked={hideIdentical}
          onChange={(event) => setHideIdentical(event.target.checked)}
        >
          پنهان‌کردن ردیف‌های مشابه ({faNumber(identical)})
        </Checkbox>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3 md:hidden">
        {([a, b] as const).map((item, index) => {
          const id = `comparison-plan-${index + 1}`;
          const name = index === 0 ? "اول" : "دوم";
          return (
            <div key={id} className="min-w-0">
              <FieldLabel htmlFor={id}>طرح {name}</FieldLabel>
              <div className="mt-2">
                <SelectInput
                  id={id}
                  label={`انتخاب طرح ${name}`}
                  value={item?.product.slug ?? ""}
                  onValueChange={(value) => {
                    setPair(
                      index === 0
                        ? [
                            value,
                            value === b?.product.slug
                              ? (a?.product.slug ?? "")
                              : (b?.product.slug ?? ""),
                          ]
                        : [
                            value === a?.product.slug
                              ? (b?.product.slug ?? "")
                              : (a?.product.slug ?? ""),
                            value,
                          ],
                    );
                  }}
                  options={compared.map(({ product }) => ({
                    value: product.slug,
                    label: `${product.nameFa} · ${product.insurerNameFa}`,
                  }))}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="md:hidden">
        <Table
          compared={mobile}
          rows={rows}
          onToggle={onToggle}
          onSource={onSource}
          hideIdentical={hideIdentical}
          selectionCount={compared.length}
        />
      </div>
      <div className="hidden md:block">
        <Table
          compared={compared}
          rows={rows}
          onToggle={onToggle}
          onSource={onSource}
          hideIdentical={hideIdentical}
          selectionCount={compared.length}
        />
      </div>
      <p className="mt-3 text-xs leading-6 text-text-muted">
        «نامشخص» به معنی نداشتن پوشش نیست. در نمایش کوچک، دو طرح را برای جدول انتخاب کنید.
      </p>
    </section>
  );
}
