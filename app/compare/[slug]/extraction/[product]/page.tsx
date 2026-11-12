import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCatalogue, getProductSource } from "@/lib/data/catalog";
import { activeSchemas } from "@/lib/schemas/registry";
import { ExtractionInspector } from "@/components/extraction-inspector";
type Props = { params: Promise<{ slug: string; product: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, product } = await params;
  const cat = await getCatalogue(slug);
  const found = cat?.products.find((item) => item.slug === product);
  return {
    title: found ? `پشت صحنه استخراج ${found.nameFa}` : "صفحه پیدا نشد",
    description: "متن نمونه و فیلدهای استخراج‌شده را کنار هم بررسی کنید.",
  };
}
export default async function ExtractionPage({ params }: Props) {
  const { slug, product: productSlug } = await params;
  if (!activeSchemas.some((schema) => schema.slug === slug)) notFound();
  const catalogue = await getCatalogue(slug);
  const product = catalogue?.products.find((item) => item.slug === productSlug);
  if (!catalogue || !product) notFound();
  const source = await getProductSource(slug, productSlug);
  if (!source) notFound();
  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-8 pt-7 sm:px-8">
      <Link
        href={`/compare/${slug}`}
        className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand-strong"
      >
        <ArrowRight size={17} aria-hidden="true" /> بازگشت به مقایسه
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-brand-strong">پشت صحنه مقایسه</p>
          <h1 className="mt-1 text-2xl font-extrabold">از متن تا پوشش‌های قابل بررسی</h1>
          <p className="mt-2 text-sm leading-7 text-text-muted">
            {product.nameFa} · {product.insurerNameFa}
          </p>
        </div>
        <span className="rounded-xl bg-warning-soft px-3 py-2 text-xs font-bold text-warning">
          {product.isSampleData ? "متن و طرح ساختگی" : "متن منبع"}
        </span>
      </div>
      <ExtractionInspector
        schema={catalogue.schema}
        product={product}
        sourceText={source.sourceText}
      />
    </main>
  );
}
