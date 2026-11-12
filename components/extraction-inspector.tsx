"use client";
import { useMemo, useState } from "react";
import { formatValue, faNumber } from "@/lib/domain/format";
import { getCoverage } from "@/lib/domain/ranking";
import type { ComparableProduct, InsuranceSchema } from "@/lib/schemas/contracts";
import { provenanceText } from "./provenance";

type Segment = { text: string; key?: string };
export function ExtractionInspector({
  schema,
  product,
  sourceText,
}: {
  schema: InsuranceSchema;
  product: ComparableProduct;
  sourceText: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const segments = useMemo(() => {
    const spans = product.coverages
      .flatMap((value) => {
        const index = value.evidence ? sourceText.indexOf(value.evidence) : -1;
        return index < 0 || !value.evidence
          ? []
          : [{ start: index, end: index + value.evidence.length, key: value.fieldKey }];
      })
      .sort((a, b) => a.start - b.start || b.end - a.end);
    const parts: Segment[] = [];
    let cursor = 0;
    for (const span of spans) {
      if (span.start < cursor) continue;
      if (span.start > cursor) parts.push({ text: sourceText.slice(cursor, span.start) });
      parts.push({ text: sourceText.slice(span.start, span.end), key: span.key });
      cursor = span.end;
    }
    if (cursor < sourceText.length) parts.push({ text: sourceText.slice(cursor) });
    return parts;
  }, [product.coverages, sourceText]);
  return (
    <>
      <div className="mt-6 rounded-2xl bg-info-soft p-4 text-xs leading-7 text-info">
        {provenanceText(product.provenance)}. برای دیدن ارتباط دو طرف، روی یک فیلد یا بخش مشخص‌شده
        متن بروید یا با صفحه‌کلید آن را انتخاب کنید. وجود نقل‌قول، صحت معنایی را تضمین نمی‌کند.
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="policy-text-title"
          className="rounded-3xl border border-border bg-surface-raised p-5 shadow-card sm:p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="policy-text-title" className="text-lg font-extrabold">
              متن {product.isSampleData ? "بیمه‌نامه نمونه" : "منبع"}
            </h2>
            <span className="text-xs text-text-muted">نقل‌قول‌ها مشخص‌اند</span>
          </div>
          <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-surface-muted p-4 text-sm leading-8 text-text">
            {segments.map((segment, index) =>
              segment.key ? (
                <button
                  key={`${segment.key}-${index}`}
                  type="button"
                  onMouseEnter={() => setActive(segment.key!)}
                  onFocus={() => setActive(segment.key!)}
                  onClick={() => setActive(segment.key!)}
                  title={`نمایش فیلد ${schema.fields.find((field) => field.key === segment.key)?.labelFa ?? "منبع"}`}
                  aria-pressed={active === segment.key}
                  className={`inline min-h-11 rounded-md border-b-2 px-1 text-start font-medium transition ${active === segment.key ? "border-brand bg-brand-soft text-brand-strong" : "border-success bg-success-soft text-text"}`}
                >
                  {segment.text}
                </button>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </div>
        </section>
        <section
          aria-labelledby="extracted-fields-title"
          className="rounded-3xl border border-border bg-surface-raised p-5 shadow-card sm:p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="extracted-fields-title" className="text-lg font-extrabold">
              فیلدهای استخراج‌شده
            </h2>
            <span className="text-xs text-text-muted">{faNumber(schema.fields.length)} فیلد</span>
          </div>
          <div className="mt-4 space-y-2">
            {schema.fields.map((field) => {
              const value = getCoverage(product, field.key);
              return (
                <button
                  key={field.key}
                  type="button"
                  onMouseEnter={() => setActive(field.key)}
                  onFocus={() => setActive(field.key)}
                  onClick={() => setActive(field.key)}
                  aria-pressed={active === field.key}
                  className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border p-3 text-start transition ${active === field.key ? "border-brand bg-brand-soft" : "border-border bg-surface-raised hover:bg-surface-muted"}`}
                >
                  <span>
                    <span className="block text-xs font-bold">{field.labelFa}</span>
                    <span className="text-xs text-text-muted">
                      {value?.evidence
                        ? `اطمینان اعلام‌شده ${faNumber(Math.round(value.confidence * 100))}٪`
                        : "بدون شاهد تأییدشده"}
                    </span>
                  </span>
                  <strong
                    className={`text-xs ${value?.value === null || !value ? "text-text-muted" : "text-text"}`}
                  >
                    {formatValue(field, value?.value ?? null)}
                  </strong>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
