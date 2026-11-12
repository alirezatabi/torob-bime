import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProvenanceText } from "@/components/provenance";
it("labels rules, saved snapshots and live output separately; model names stay LTR", () => {
  expect(renderToStaticMarkup(<ProvenanceText provenance={{ kind: "rules" }} />)).toContain(
    "قانون‌محور (آفلاین)",
  );
  const snapshot = renderToStaticMarkup(
    <ProvenanceText
      provenance={{ kind: "snapshot", model: "mock-model", generatedAt: "2026-01-01T00:00:00Z" }}
    />,
  );
  expect(snapshot).toContain('<bdi dir="ltr">mock-model</bdi>');
  expect(snapshot).toContain("اسنپ‌شات");
  expect(snapshot).not.toContain("زنده");
  const live = renderToStaticMarkup(
    <ProvenanceText provenance={{ kind: "live", model: "mock-model" }} />,
  );
  expect(live).toContain("زنده با مدل");
});
