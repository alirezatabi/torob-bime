import type { ExtractionProvenance } from "@/lib/schemas/contracts";
export function provenanceText(provenance?: ExtractionProvenance): string {
  if (!provenance || provenance.kind === "rules") return "قانون‌محور (آفلاین)";
  if (provenance.kind === "live") return `زنده با مدل ${provenance.model}`;
  const date = new Date(provenance.generatedAt);
  const formatted = Number.isNaN(date.getTime())
    ? provenance.generatedAt
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(date);
  return `استخراج‌شده با مدل ${provenance.model} در تاریخ ${formatted} (اسنپ‌شات)`;
}
