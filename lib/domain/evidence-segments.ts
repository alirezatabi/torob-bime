import type { CoverageValue } from "@/lib/schemas/contracts";

export type EvidenceSegment = { text: string; keys: string[] };

/** Partition the original text at quote boundaries, preserving overlapping links. */
export function buildEvidenceSegments(
  source: string,
  values: Pick<CoverageValue, "fieldKey" | "evidence">[],
): EvidenceSegment[] {
  const spans = values.flatMap(({ fieldKey, evidence }) => {
    const start = evidence ? source.indexOf(evidence) : -1;
    return start < 0 || !evidence ? [] : [{ start, end: start + evidence.length, key: fieldKey }];
  });
  const boundaries = [
    ...new Set([0, source.length, ...spans.flatMap((span) => [span.start, span.end])]),
  ].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    return {
      text: source.slice(start, end),
      keys: spans.filter((span) => span.start <= start && span.end >= end).map((span) => span.key),
    };
  });
}
