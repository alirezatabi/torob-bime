"use client";
import Link from "next/link";
import { FileSearch } from "lucide-react";
import { faNumber, formatValue } from "@/lib/domain/format";
import {
  getCoverage,
  isNonCoverage,
  limitationFacts,
  scoreContributionFacts,
  type RankedProduct,
} from "@/lib/domain/ranking";
import type { ComparableProduct, InsuranceSchema } from "@/lib/schemas/contracts";
import { ProvenanceText } from "./provenance";
import { EvidenceButton, type SourceHandler } from "./evidence-button";
import { Badge } from "./ui/surfaces";
import { Button } from "./ui/button";
import { InsurerMark, ScoreRing } from "./ui/identity";

type Props = {
  ranked: RankedProduct;
  products: ComparableProduct[];
  index: number;
  schema: InsuranceSchema;
  priorities: string[];
  selected: boolean;
  selectionCount: number;
  budget: number | null;
  onToggle: (slug: string) => void;
  onSource: SourceHandler;
  suggestion?: {
    mode: "ai" | "rules";
    positiveFieldKey: string | null;
    limitationFieldKey: string | null;
  };
};
export function PlanCard({
  ranked,
  products,
  index,
  schema,
  priorities,
  selected,
  selectionCount,
  budget,
  onToggle,
  onSource,
  suggestion,
}: Props) {
  const { product, score, known, total, constraintsMet, constraintsTotal } = ranked;
  const contributions = scoreContributionFacts(product, schema, priorities, products);
  const positive =
    contributions.find((fact) => fact.field.key === suggestion?.positiveFieldKey) ??
    contributions[0];
  const nonCoverage = limitationFacts(product, schema, priorities).filter(isNonCoverage);
  const limitation =
    nonCoverage.find((fact) => fact.field.key === suggestion?.limitationFieldKey) ?? nonCoverage[0];
  const otherLimitations = nonCoverage.filter((fact) => fact.field.key !== limitation?.field.key);
  const modelSelectedFact = Boolean(
    suggestion?.mode === "ai" &&
    ((suggestion.positiveFieldKey && positive?.field.key === suggestion.positiveFieldKey) ||
      (suggestion.limitationFieldKey && limitation?.field.key === suggestion.limitationFieldKey)),
  );
  const premiumField = schema.fields.find((field) => field.isPremium);
  const premium = premiumField ? getCoverage(product, premiumField.key) : undefined;
  const premiumValue =
    typeof premium?.value === "number" && premium.evidence ? premium.value : null;
  return (
    <article
      className={`flex min-w-[min(320px,calc(100vw-3rem))] snap-start flex-col rounded-3xl border bg-surface-raised p-5 shadow-card md:min-w-0 sm:p-6 ${index === 0 ? "border-brand" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone={index === 0 ? "brand" : "neutral"}>رتبه {faNumber(index + 1)} پوشش</Badge>
        {product.isSampleData && <Badge tone="warning">نمونه</Badge>}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <InsurerMark slug={product.insurerSlug} name={product.insurerNameFa} />
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold">{product.nameFa}</h3>
          <p className="text-sm leading-7 text-text-muted">{product.insurerNameFa}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface-muted p-4">
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
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs font-bold leading-6 text-text-muted">
            حق‌بیمه سالانه نمونه، قیمت واقعی نیست
          </p>
          <div className="flex items-center justify-between gap-2">
            <strong className="text-base">
              {premiumField ? formatValue(premiumField, premiumValue) : "نامشخص"}
            </strong>
            {premiumField && (
              <EvidenceButton
                product={product}
                field={premiumField}
                coverage={premium}
                onSource={onSource}
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
      </div>
      <div className="mt-4 grid flex-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-success-soft p-4">
          <h4 className="text-xs font-extrabold text-success">یک معیار مؤثر در امتیاز</h4>
          {positive ? (
            <>
              <p className="mt-2 text-sm leading-7">
                <strong>
                  {positive.field.labelFa}: {formatValue(positive.field, positive.coverage.value)}
                </strong>
                ؛{" "}
                {positive.prioritized
                  ? "این اولویت با وزن ۳ برابر محاسبه شده است."
                  : "این معیار در امتیاز پوشش سهم دارد."}
              </p>
              <EvidenceButton
                product={product}
                field={positive.field}
                coverage={positive.coverage}
                onSource={onSource}
              />
            </>
          ) : (
            <p className="mt-2 text-sm leading-7 text-text-muted">
              معیار مستندی با سهم مثبت در امتیاز ثبت نشده است.
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-danger-soft p-4">
          <h4 className="text-xs font-extrabold text-danger">چه چیزی پوشش داده نمی‌شود؟</h4>
          {limitation ? (
            <>
              <p className="mt-2 text-sm leading-7">
                {limitation.field.isExclusion
                  ? String(limitation.coverage.value)
                  : `${limitation.field.labelFa}: ${formatValue(limitation.field, limitation.coverage.value)}`}
              </p>
              <EvidenceButton
                product={product}
                field={limitation.field}
                coverage={limitation.coverage}
                onSource={onSource}
              />
              {otherLimitations.length > 0 && (
                <details>
                  <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-danger">
                    موارد بیشتر ({faNumber(otherLimitations.length)})
                  </summary>
                  <ul>
                    {otherLimitations.map(({ field, coverage }) => (
                      <li key={field.key} className="border-t border-border py-2 text-sm leading-7">
                        {field.isExclusion
                          ? String(coverage.value)
                          : `${field.labelFa}: ${formatValue(field, coverage.value)}`}
                        <EvidenceButton
                          product={product}
                          field={field}
                          coverage={coverage}
                          onSource={onSource}
                        />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm leading-7 text-text-muted">
              مورد صریحی از نبود پوشش ثبت نشده؛ این به معنی نبود محدودیت نیست.
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 text-xs leading-7 text-text-muted">
        <p>
          روش استخراج: <ProvenanceText provenance={product.provenance} />
        </p>
        {modelSelectedFact && <p>انتخاب برخی نکات با مدل؛ متن از مقادیر مستند ساخته شده است.</p>}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button
          variant={selected ? "secondary" : "primary"}
          aria-pressed={selected}
          disabled={selected && selectionCount <= 2}
          onClick={() => onToggle(product.slug)}
          className="flex-1"
        >
          {selected ? "حذف از مقایسه" : "افزودن به مقایسه"}
        </Button>
        <Link
          href={`/compare/${schema.slug}/extraction/${product.slug}`}
          aria-label={`پشت صحنه استخراج ${product.nameFa}، ${product.insurerNameFa}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold text-text-muted transition hover:border-brand hover:text-brand-strong"
        >
          <FileSearch size={17} aria-hidden="true" /> پشت‌صحنه
        </Link>
      </div>
    </article>
  );
}
