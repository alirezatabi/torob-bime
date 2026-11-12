"use client";
import Link from "next/link";
import { Check, CircleHelp, FileSearch, X } from "lucide-react";
import { faNumber, formatValue } from "@/lib/domain/format";
import {
  getCoverage,
  limitationFacts,
  isNonCoverage,
  type RankedProduct,
} from "@/lib/domain/ranking";
import type { InsuranceSchema } from "@/lib/schemas/contracts";
import { provenanceText } from "./provenance";
import { EvidenceButton, type SourceHandler } from "./evidence-button";
import { Badge } from "./ui/surfaces";
import { Button } from "./ui/button";
import { InsurerMark, ScoreRing } from "./ui/identity";

type Props = {
  ranked: RankedProduct;
  index: number;
  schema: InsuranceSchema;
  priorities: string[];
  selected: boolean;
  selectionCount: number;
  budget: number | null;
  onToggle: (slug: string) => void;
  onSource: SourceHandler;
  preferredKeys?: string[];
};
export function PlanCard({
  ranked,
  index,
  schema,
  priorities,
  selected,
  selectionCount,
  budget,
  onToggle,
  onSource,
  preferredKeys = [],
}: Props) {
  const { product, score, known, total, constraintsMet, constraintsTotal } = ranked;
  const facts = schema.fields
    .filter(
      (field) =>
        !field.isExclusion &&
        !field.isPremium &&
        field.kind !== "text" &&
        getCoverage(product, field.key)?.evidence,
    )
    .sort(
      (a, b) =>
        Number(preferredKeys.includes(b.key)) - Number(preferredKeys.includes(a.key)) ||
        Number(priorities.includes(b.key)) - Number(priorities.includes(a.key)),
    )
    .slice(0, 3);
  const limits = limitationFacts(product, schema, priorities).filter(isNonCoverage);
  const premiumField = schema.fields.find((field) => field.isPremium);
  const premium = premiumField ? getCoverage(product, premiumField.key) : undefined;
  const premiumValue =
    typeof premium?.value === "number" && premium.evidence ? premium.value : null;
  return (
    <article
      className={`flex min-w-[285px] snap-start flex-col rounded-3xl border bg-surface-raised p-5 shadow-card lg:min-w-0 ${index === 0 ? "border-brand" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone={index === 0 ? "brand" : "neutral"}>رتبه {faNumber(index + 1)} پوشش</Badge>
        {product.isSampleData && <Badge tone="warning">نمونه</Badge>}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <InsurerMark slug={product.insurerSlug} name={product.insurerNameFa} />
        <div className="min-w-0">
          <h3 className="text-base font-extrabold">{product.nameFa}</h3>
          <p className="text-xs leading-6 text-text-muted">{product.insurerNameFa}</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-surface-muted p-3">
        <ScoreRing score={score} />
        <p className="mt-2 text-xs text-text-muted">
          {faNumber(known)} از {faNumber(total)} معیار مشخص
        </p>
        {constraintsTotal > 0 && (
          <p className="mt-1 text-xs font-bold text-warning">
            {faNumber(constraintsMet)} از {faNumber(constraintsTotal)} شرط تأیید شده
          </p>
        )}
      </div>
      <div className="mt-4 border-b border-border pb-4">
        <p className="text-xs font-bold text-text-muted">حق‌بیمه سالانه نمونه، قیمت واقعی نیست</p>
        <div className="flex items-center justify-between gap-2">
          <strong className="text-sm">
            {premiumField ? formatValue(premiumField, premiumValue) : "نامشخص"}
          </strong>
          {premiumField && (
            <EvidenceButton
              product={product}
              field={premiumField}
              coverage={premium}
              onSource={onSource}
              compact
            />
          )}
        </div>
        {budget !== null && (
          <p
            className={`text-xs font-bold ${premiumValue === null ? "text-text-muted" : premiumValue <= budget ? "text-success" : "text-warning"}`}
          >
            {premiumValue === null
              ? "تناسب با بودجه نامشخص"
              : premiumValue <= budget
                ? "در محدوده بودجه نمونه"
                : "بیشتر از بودجه نمونه"}
          </p>
        )}
      </div>
      <ul className="mt-3 space-y-1">
        {facts.length ? (
          facts.map((field) => {
            const coverage = getCoverage(product, field.key)!;
            return (
              <li key={field.key} className="flex items-center gap-1 text-xs leading-6">
                <span
                  className={
                    coverage.value === true
                      ? "text-success"
                      : coverage.value === false
                        ? "text-danger"
                        : "text-info"
                  }
                >
                  {coverage.value === true ? (
                    <Check size={16} aria-hidden="true" />
                  ) : coverage.value === false ? (
                    <X size={16} aria-hidden="true" />
                  ) : (
                    <CircleHelp size={16} aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {field.labelFa}: <strong>{formatValue(field, coverage.value)}</strong>
                </span>
                <EvidenceButton
                  product={product}
                  field={field}
                  coverage={coverage}
                  onSource={onSource}
                  compact
                />
              </li>
            );
          })
        ) : (
          <li className="text-xs text-text-muted">پوشش مستندی برای نمایش ثبت نشده است.</li>
        )}
      </ul>
      <div className="mt-3 rounded-2xl bg-danger-soft p-3">
        <h4 className="text-xs font-extrabold text-danger">چه چیزی پوشش داده نمی‌شود؟</h4>
        {limits.length ? (
          <>
            <ul className="mt-1">
              {limits.slice(0, 2).map(({ field, coverage }) => (
                <li key={field.key} className="flex items-center gap-1 text-xs leading-6 text-text">
                  <span className="min-w-0 flex-1">
                    {field.isExclusion
                      ? String(coverage.value)
                      : `${field.labelFa}: ${formatValue(field, coverage.value)}`}
                  </span>
                  <EvidenceButton
                    product={product}
                    field={field}
                    coverage={coverage}
                    onSource={onSource}
                    compact
                  />
                </li>
              ))}
            </ul>
            {limits.length > 2 && (
              <details>
                <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-danger">
                  محدودیت‌های بیشتر
                </summary>
                <ul>
                  {limits.slice(2).map(({ field, coverage }) => (
                    <li key={field.key} className="flex items-center gap-1 text-xs">
                      <span className="flex-1">
                        {field.isExclusion
                          ? String(coverage.value)
                          : `${field.labelFa}: ${formatValue(field, coverage.value)}`}
                      </span>
                      <EvidenceButton
                        product={product}
                        field={field}
                        coverage={coverage}
                        onSource={onSource}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs leading-6 text-text-muted">
            محدودیتی ثبت نشده؛ این به معنی نبود محدودیت نیست.
          </p>
        )}
      </div>
      <p className="mt-4 text-xs leading-6 text-text-muted">{provenanceText(product.provenance)}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button
          variant={selected ? "secondary" : "primary"}
          aria-pressed={selected}
          disabled={selected && selectionCount <= 2}
          onClick={() => onToggle(product.slug)}
          className="flex-1 text-xs"
        >
          {selected ? "حذف از مقایسه" : "افزودن به مقایسه"}
        </Button>
        <Link
          href={`/compare/${schema.slug}/extraction/${product.slug}`}
          aria-label={`پشت صحنه استخراج ${product.nameFa}، ${product.insurerNameFa}`}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border px-3 text-xs font-bold text-text-muted hover:text-brand-strong"
        >
          <FileSearch size={17} aria-hidden="true" /> متن
        </Link>
      </div>
    </article>
  );
}
