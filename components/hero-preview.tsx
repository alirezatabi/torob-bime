import Link from "next/link";
import { ArrowLeft, Check, FileText, Sparkles, X } from "lucide-react";
import samples from "@/fixtures/products.json";
import { extractOffline } from "@/lib/ai/offline-extraction";
import { groundExtraction } from "@/lib/ai/grounding";
import { formatValue } from "@/lib/domain/format";
import { carBodySchema } from "@/lib/schemas/car-body";

export function HeroPreview() {
  const products = samples
    .filter((product) => ["car-body-aftab", "car-body-sepehr"].includes(product.slug))
    .map((product) => ({
      ...product,
      values: groundExtraction(
        extractOffline(carBodySchema, product.sourceText),
        carBodySchema,
        product.sourceText,
      ).values,
    }));
  const fields = carBodySchema.fields.filter((field) =>
    ["minor_damage", "partial_theft", "deductible"].includes(field.key),
  );
  return (
    <div className="relative mx-auto w-full max-w-[450px] lg:ms-auto">
      <div
        className="absolute -inset-5 -z-10 rounded-[40px] bg-[#f8f0f0] sm:-inset-7"
        aria-hidden="true"
      />
      <div className="overflow-hidden rounded-[22px] border border-[#edeff1] bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-[#f1f2f4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf0f1] text-brand">
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-bold">یک مقایسه، هزار نکته</p>
              <p className="mt-1 text-[11px] text-[#63707d]">پوشش‌ها رو کنار هم ببین</p>
            </div>
          </div>
          <span className="rounded-md bg-[#f5f6f7] px-2 py-1 text-[11px] font-medium text-[#63707d]">
            نمونه
          </span>
        </div>
        <div className="px-6 pb-5 pt-2">
          <div className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-2 border-b border-[#f1f2f4] py-4 text-center text-[11px] font-semibold text-[#63707d]">
            <span className="text-start">پوشش‌ها</span>
            {products.map((product) => (
              <span key={product.slug}>{product.nameFa}</span>
            ))}
          </div>
          {fields.map((field) => (
            <div
              key={field.key}
              className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-2 border-b border-[#f4f5f6] py-4 text-[12px]"
            >
              <span className="font-medium text-[#5f6875]">{field.labelFa}</span>
              {products.map((product) => {
                const value =
                  product.values.find((row) => row.fieldKey === field.key)?.value ?? null;
                return (
                  <span
                    key={product.slug}
                    className={`flex items-center justify-center gap-1 font-semibold ${value === true ? "text-[#397354]" : value === false ? "text-[#a34d55]" : "text-[#68727e]"}`}
                  >
                    {value === true ? (
                      <Check size={14} aria-hidden="true" />
                    ) : value === false ? (
                      <X size={14} aria-hidden="true" />
                    ) : null}
                    {formatValue(field, value)}
                  </span>
                );
              })}
            </div>
          ))}
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#fcf5f4] px-3 py-3 text-[11px] leading-5 text-[#a15c5b]">
            <FileText size={16} className="shrink-0" aria-hidden="true" />
            <span>پشت هر پوشش، یک متن قابل بررسی هست.</span>
          </div>
          <Link
            href="/compare/car-body"
            className="mt-5 flex items-center justify-center gap-2 text-[12px] font-bold text-brand hover:text-brand-dark"
          >
            دیدن مقایسه نمونه <ArrowLeft size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="absolute -bottom-5 -start-3 hidden items-center gap-3 rounded-2xl border border-[#f1e6e5] bg-white px-4 py-3 shadow-card sm:flex lg:-start-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf6ef] text-[#397354]">
          <Check size={18} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[11px] font-bold text-[#525d69]">شفاف و قابل پیگیری</span>
          <span className="mt-1 block text-[10px] text-[#63707d]">با ارجاع به متن بیمه‌نامه</span>
        </span>
      </div>
    </div>
  );
}
