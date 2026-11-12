"use client";
import { BookOpenText, ExternalLink, X } from "lucide-react";
import { faNumber } from "@/lib/domain/format";
import type { ExtractionProvenance } from "@/lib/schemas/contracts";
import { provenanceText } from "./provenance";
import { Drawer } from "./ui/drawer";
import { IconButton } from "./ui/button";

export type SourceDialogData = {
  title: string;
  productName: string;
  evidence: string;
  context?: string;
  value: string;
  confidence: number;
  provenance?: ExtractionProvenance;
  sourceUrl: string | null;
  isSampleData: boolean;
};
export function SourceDialog({
  source,
  onClose,
}: {
  source: SourceDialogData;
  onClose: () => void;
}) {
  const context = source.context ?? source.evidence;
  const index = context.indexOf(source.evidence);
  return (
    <Drawer onClose={onClose} titleId="source-title">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
              <BookOpenText size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 id="source-title" className="text-lg font-extrabold">
                منبع این پوشش
              </h2>
              <p className="text-xs text-text-muted">
                {source.title} · {source.productName}
              </p>
            </div>
          </div>
          <IconButton label="بستن پنجره منبع" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        </div>
        {source.isSampleData && (
          <p className="mt-6 rounded-xl bg-warning-soft px-4 py-3 text-xs leading-6 text-warning">
            این متن و طرح ساختگی و صرفاً برای نمایش هستند؛ قیمت واقعی نیست.
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-surface-muted p-4 text-xs">
          <div>
            <span className="block text-text-muted">مقدار استخراج‌شده</span>
            <strong>{source.value}</strong>
          </div>
          <div>
            <span className="block text-text-muted">اطمینان اعلام‌شده</span>
            <strong>{faNumber(Math.round(source.confidence * 100))}٪</strong>
          </div>
        </div>
        <p className="mb-2 mt-6 text-xs font-bold text-text-muted">
          نقل‌قول دقیق از متن {source.isSampleData ? "نمونه" : "بیمه‌نامه"}
        </p>
        <blockquote className="rounded-2xl border border-border bg-surface-muted p-4 text-sm leading-8 text-text">
          {index >= 0 ? (
            <>
              {context.slice(0, index)}
              <mark className="rounded bg-warning-soft px-0.5 text-text">{source.evidence}</mark>
              {context.slice(index + source.evidence.length)}
            </>
          ) : (
            source.evidence
          )}
        </blockquote>
        <p className="mt-4 text-xs leading-6 text-text-muted">
          {provenanceText(source.provenance)}. وجود نقل‌قول به‌تنهایی درستی معنایی را تضمین نمی‌کند؛
          متن کامل را هم بررسی کنید.
        </p>
        {source.sourceUrl && (
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand-strong"
          >
            مشاهده منبع اصلی <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}
      </div>
    </Drawer>
  );
}
