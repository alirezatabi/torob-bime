import { expect, it } from "vitest";
import { buildEvidenceSegments } from "@/lib/domain/evidence-segments";

it("keeps every field linked when evidence quotes partially or fully overlap", () => {
  const source = "abcdefghijkl";
  const segments = buildEvidenceSegments(source, [
    { fieldKey: "first", evidence: "bcdef" },
    { fieldKey: "second", evidence: "defghi" },
    { fieldKey: "third", evidence: "defghi" },
    { fieldKey: "missing", evidence: null },
    { fieldKey: "invalid", evidence: "not in the source" },
  ]);
  expect(segments).toEqual([
    { text: "a", keys: [] },
    { text: "bc", keys: ["first"] },
    { text: "def", keys: ["first", "second", "third"] },
    { text: "ghi", keys: ["second", "third"] },
    { text: "jkl", keys: [] },
  ]);
  expect(segments.map((segment) => segment.text).join("")).toBe(source);
});
