import type { ExtractionProvenance } from "@/lib/schemas/contracts";

/** Model identifiers are isolated LTR text inside the Persian sentence. */
export function ProvenanceText({ provenance }: { provenance?: ExtractionProvenance }) {
  if (!provenance || provenance.kind === "rules") return <>قانون‌محور (آفلاین)</>;
  const model = <bdi dir="ltr">{provenance.model}</bdi>;
  if (provenance.kind === "live") return <>زنده با مدل {model}</>;
  const date = new Date(provenance.generatedAt);
  const formatted = Number.isNaN(date.getTime())
    ? provenance.generatedAt
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(date);
  return (
    <>
      استخراج‌شده با مدل {model} در تاریخ {formatted} (اسنپ‌شات)
    </>
  );
}
