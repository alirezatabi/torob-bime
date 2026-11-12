import { notFound } from "next/navigation";
import { z } from "zod";
import { Suspense } from "react";
import { ComparisonExperience } from "@/components/comparison-experience";
import { getCatalogue } from "@/lib/data/catalog";
import { aiConfigured } from "@/lib/ai/extraction";
import { activeSchemas } from "@/lib/schemas/registry";
import type { CoverageConstraint } from "@/lib/schemas/contracts";

export const dynamic = "force-dynamic";
export const dynamicParams = false;
export function generateStaticParams() {
  return activeSchemas.map((schema) => ({ slug: schema.slug }));
}
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    priorities?: string;
    required?: string;
    budget?: string;
    intent?: string;
  }>;
};
export default async function ComparePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  // Validate before creating a streaming boundary so invalid URLs return HTTP 404.
  if (!activeSchemas.some((schema) => schema.slug === slug)) notFound();
  return (
    <Suspense fallback={<CompareLoading />}>
      <ComparisonContent slug={slug} searchParams={searchParams} />
    </Suspense>
  );
}

function CompareLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-20" aria-live="polite">
      <div className="h-6 w-48 animate-pulse rounded-lg bg-[#eceff1]" />
      <div className="mt-6 h-24 animate-pulse rounded-2xl bg-white" />
      <p className="mt-6 text-xs text-[#63707d]">در حال آماده‌سازی مقایسه...</p>
    </main>
  );
}

async function ComparisonContent({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: PageProps["searchParams"];
}) {
  const catalogue = await getCatalogue(slug);
  if (!catalogue) notFound();
  const query = await searchParams;
  const priorities =
    typeof query.priorities === "string"
      ? query.priorities
          .split(",")
          .filter((key) =>
            catalogue.schema.fields.some(
              (field) => field.key === key && !field.isExclusion && field.kind !== "text",
            ),
          )
          .slice(0, 12)
      : [];
  const requiredKeys =
    typeof query.required === "string"
      ? [...new Set(query.required.split(","))]
          .filter((key) =>
            catalogue.schema.fields.some(
              (field) =>
                field.key === key &&
                field.kind === "boolean" &&
                field.higherIsBetter &&
                !field.isExclusion,
            ),
          )
          .slice(0, 12)
      : [];
  const constraints: CoverageConstraint[] = requiredKeys.map((fieldKey) => ({
    fieldKey,
    kind: "covered",
  }));
  const budgetParsed = z.coerce
    .number()
    .nonnegative()
    .max(1_000_000_000_000)
    .safeParse(query.budget);
  const budget = query.budget !== undefined && budgetParsed.success ? budgetParsed.data : null;
  const hasAi = aiConfigured();
  // Never claim model interpretation in an environment where no model is configured.
  const intentMode =
    query.intent === "rules" ? "rules" : query.intent === "ai" && hasAi ? "ai" : null;
  return (
    <ComparisonExperience
      schema={catalogue.schema}
      products={catalogue.products}
      mode={catalogue.mode}
      initialPriorities={priorities}
      initialConstraints={constraints}
      budget={budget}
      intentMode={intentMode}
      hasAi={hasAi}
    />
  );
}
