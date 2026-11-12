import Link from "next/link";
import { ArrowLeft, BookOpenText, Check, Minus, X } from "lucide-react";
import { evidenceBackedValue } from "@/lib/domain/ranking";
import { formatValue } from "@/lib/domain/format";
import type { ComparableProduct, InsuranceSchema } from "@/lib/schemas/contracts";
import { ProvenanceText } from "./provenance";
import { InsurerMark } from "./ui/identity";
import { LinkStatus } from "./ui/link-status";
export function HeroPreview({
  schema,
  products,
}: {
  schema: InsuranceSchema;
  products: ComparableProduct[];
}) {
  const shown = products.slice(0, 2);
  const fields = schema.fields
    .filter((field) => !field.isPremium && !field.isExclusion && field.kind === "boolean")
    .slice(0, 3);
  return (
    <div className="hero-preview-enter relative mx-auto max-w-[470px]">
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-brand-soft sm:-inset-7"
      />
      <div className="overflow-hidden rounded-3xl border border-border bg-surface-raised shadow-float">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <p className="text-xs font-bold text-brand-strong">یک نگاه به مقایسه</p>
            <h2 className="mt-1 text-lg font-extrabold">{schema.shortNameFa}</h2>
          </div>
          <span className="rounded-lg bg-warning-soft px-3 py-1 text-xs font-bold text-warning">
            {shown.length > 0 && shown.every((product) => product.isSampleData)
              ? "طرح‌های نمونه"
              : "پیش‌نمایش طرح‌ها"}
          </span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-[1fr_1fr_1fr] items-end gap-3 border-b border-border pb-4">
            <span className="text-xs font-bold text-text-muted">پوشش</span>
            {shown.map((product) => (
              <div key={product.slug} className="min-w-0 text-center">
                <div className="mx-auto mb-2 flex justify-center">
                  <InsurerMark slug={product.insurerSlug} name={product.insurerNameFa} />
                </div>
                <p className="text-xs font-bold">
                  {product.nameFa}
                  {product.isSampleData ? " (نمونه)" : ""}
                </p>
              </div>
            ))}
          </div>
          {fields.map((field) => (
            <div
              key={field.key}
              className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 border-b border-border py-4"
            >
              <span className="text-xs font-bold leading-6 text-text-muted">{field.labelFa}</span>
              {shown.map((product) => {
                const value = evidenceBackedValue(product, field.key);
                return (
                  <span
                    key={product.slug}
                    className={`flex items-center justify-center gap-1 text-xs font-bold ${value === true ? "text-success" : value === false ? "text-danger" : "text-text-muted"}`}
                  >
                    {value === true ? (
                      <Check size={15} aria-hidden="true" />
                    ) : value === false ? (
                      <X size={15} aria-hidden="true" />
                    ) : (
                      <Minus size={15} aria-hidden="true" />
                    )}
                    {formatValue(field, value)}
                  </span>
                );
              })}
            </div>
          ))}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft p-3 text-xs leading-7 text-brand-strong">
            <BookOpenText size={17} className="mt-1 shrink-0" aria-hidden="true" />
            <span>
              منبع مقادیر مشخص در صفحه مقایسه قابل بررسی است.
              <span className="block">
                {shown.length ? (
                  <>
                    روش استخراج طرح اول: <ProvenanceText provenance={shown[0].provenance} />
                  </>
                ) : (
                  "اطلاعات نمونه در دسترس نیست."
                )}
              </span>
            </span>
          </div>
          <Link
            href={`/compare/${schema.slug}`}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand-strong"
          >
            دیدن مقایسه <ArrowLeft size={16} aria-hidden="true" /> <LinkStatus />
          </Link>
        </div>
      </div>
    </div>
  );
}
