"use client";

import { useEffect, useRef } from "react";
import { BookOpenText, ExternalLink, X } from "lucide-react";

export type SourceDialogData = {
  title: string;
  productName: string;
  evidence: string;
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
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className="dialog-backdrop m-auto w-[calc(100%-2rem)] max-w-lg rounded-[20px] border-0 bg-white p-0 text-ink shadow-float"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0f1] text-brand">
              <BookOpenText size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold">منبع این پوشش</h2>
              <p className="mt-1 text-[12px] text-[#63707d]">
                {source.title} · {source.productName}
              </p>
            </div>
          </div>
          <button
            autoFocus
            onClick={() => ref.current?.close()}
            className="rounded-lg p-2 text-[#63707d] hover:bg-[#f6f7f8]"
            aria-label="بستن پنجره منبع"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        {source.isSampleData && (
          <p className="mt-6 rounded-xl bg-[#fff7ef] px-4 py-3 text-xs leading-6 text-[#8a5b38]">
            این متن و طرح ساختگی و صرفاً برای نمایش هستند.
          </p>
        )}
        <p className="mb-2 mt-5 text-[12px] font-bold text-[#63707d]">
          نقل‌قول دقیق از متن {source.isSampleData ? "نمونه" : "بیمه‌نامه"}
        </p>
        <blockquote className="rounded-xl border border-[#e8ebee] bg-[#fafbfc] px-4 py-4 text-sm leading-8 text-[#515b67]">
          «{source.evidence}»
        </blockquote>
        <p className="mt-4 text-[12px] leading-6 text-[#63707d]">
          نقل‌قول کمک می‌کند پوشش را بررسی کنید؛ همیشه کل شرایط و استثناها را نیز بخوانید.
        </p>
        {source.sourceUrl && (
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-dark"
          >
            مشاهده منبع اصلی <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </dialog>
  );
}
