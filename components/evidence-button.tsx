"use client";
import { BookOpenText } from "lucide-react";
import type { ComparableProduct, CoverageField, CoverageValue } from "@/lib/schemas/contracts";
export type SourceHandler = (
  product: ComparableProduct,
  field: CoverageField,
  coverage?: CoverageValue,
) => void;
export function EvidenceButton({
  product,
  field,
  coverage,
  onSource,
  compact = false,
}: {
  product: ComparableProduct;
  field: CoverageField;
  coverage?: CoverageValue;
  onSource: SourceHandler;
  compact?: boolean;
}) {
  if (!coverage?.evidence) return null;
  return (
    <button
      type="button"
      onClick={() => onSource(product, field, coverage)}
      aria-label={`نمایش منبع ${field.labelFa} در ${product.nameFa}، ${product.insurerNameFa}`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold text-text-muted transition hover:bg-brand-soft hover:text-brand-strong"
    >
      <BookOpenText size={16} aria-hidden="true" />
      {!compact && "منبع"}
    </button>
  );
}
