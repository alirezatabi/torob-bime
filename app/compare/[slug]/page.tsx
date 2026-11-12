import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComparisonExperience } from "@/components/comparison-experience";
import { getCatalogue } from "@/lib/data/catalog";
import { aiConfigured } from "@/lib/ai/anthropic";
import { activeSchemas } from "@/lib/schemas/registry";
import { readComparisonState } from "@/lib/domain/comparison-query";
import { Skeleton } from "@/components/ui/surfaces";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const schema = activeSchemas.find((item) => item.slug === slug);
  return schema
    ? {
        title: `مقایسه ${schema.nameFa}`,
        description: `مقایسه پوشش‌ها، استثناها و متن پشتیبان طرح‌های ساختگی ${schema.nameFa}.`,
      }
    : { title: "صفحه پیدا نشد" };
}
export default async function ComparePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  // Validate before the streaming boundary so unknown categories return HTTP 404.
  if (!activeSchemas.some((schema) => schema.slug === slug)) notFound();
  return (
    <Suspense fallback={<CompareLoading />}>
      <ComparisonContent slug={slug} searchParams={searchParams} />
    </Suspense>
  );
}
function CompareLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8" aria-live="polite">
      <p className="sr-only">در حال آماده‌سازی مقایسه...</p>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-5 h-20 w-full" />
      <Skeleton className="mt-6 h-32 w-full" />
      <Skeleton className="mt-12 h-8 w-56" />
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border border-border bg-surface-raised p-5">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="mt-5 h-5 w-2/3" />
            <Skeleton className="mt-5 h-20 w-full" />
            <Skeleton className="mt-5 h-32 w-full" />
            <Skeleton className="mt-5 h-11 w-full" />
          </div>
        ))}
      </div>
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
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    if (typeof value === "string") query.set(key, value);
  const initial = readComparisonState(query, catalogue.schema, catalogue.products);
  return (
    <ComparisonExperience
      schema={catalogue.schema}
      products={catalogue.products}
      mode={catalogue.mode}
      fallbackReason={catalogue.fallbackReason}
      initial={initial}
      hasAi={aiConfigured()}
    />
  );
}
