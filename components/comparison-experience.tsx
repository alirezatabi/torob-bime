"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  BookOpenText,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  FileSearch,
  Info,
  ListFilter,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { faNumber, formatMoney, formatValue } from "@/lib/domain/format";
import {
  explanationFacts,
  getCoverage,
  limitationFacts,
  rankProducts,
  relativeFieldScore,
  type FieldFact,
} from "@/lib/domain/ranking";
import type {
  ComparableProduct,
  CoverageConstraint,
  CoverageField,
  CoverageValue,
  InsuranceSchema,
} from "@/lib/schemas/contracts";
import type { ExplanationKeys } from "@/lib/ai/explanations";
import { TypeIcon } from "./type-icon";
import { SourceDialog, type SourceDialogData } from "./source-dialog";

const explanationResponse = z.object({
  mode: z.enum(["ai", "rules"]),
  items: z.array(
    z.object({
      productSlug: z.string(),
      positiveFieldKey: z.string().nullable(),
      limitationFieldKey: z.string().nullable(),
    }),
  ),
});

type Props = {
  schema: InsuranceSchema;
  products: ComparableProduct[];
  mode: "sample" | "fallback" | "database";
  initialPriorities: string[];
  initialConstraints: CoverageConstraint[];
  budget: number | null;
  intentMode: "ai" | "rules" | null;
  hasAi: boolean;
};

function factText(fact: FieldFact): string {
  const { field, coverage } = fact;
  if (field.isExclusion) return String(coverage.value);
  if (coverage.value === false) return `«${field.labelFa}» پوشش ندارد`;
  return `«${field.labelFa}»: ${formatValue(field, coverage.value)}`;
}

export function ComparisonExperience({
  schema,
  products,
  mode,
  initialPriorities,
  initialConstraints,
  budget,
  intentMode,
  hasAi,
}: Props) {
  const [priorities, setPriorities] = useState(initialPriorities);
  const [constraints, setConstraints] = useState(initialConstraints);
  const [selected, setSelected] = useState<string[]>(
    products.slice(0, 6).map((product) => product.slug),
  );
  const [hideIdentical, setHideIdentical] = useState(false);
  const [source, setSource] = useState<SourceDialogData | null>(null);
  const [aiSelection, setAiSelection] = useState<{
    mode: "ai" | "rules";
    items: ExplanationKeys[];
  } | null>(null);
  const priorityKey = priorities.join(",");
  const ranked = useMemo(
    () => rankProducts(products, schema, priorities, constraints),
    [products, schema, priorities, constraints],
  );
  const compared = ranked.filter(({ product }) => selected.includes(product.slug));
  const allFields = schema.fields.map((field) => {
    const values = compared.map(({ product }) => getCoverage(product, field.key)?.value ?? null);
    return { field, differs: new Set(values.map((value) => JSON.stringify(value))).size > 1 };
  });
  const visibleFields = allFields.filter((row) => !hideIdentical || row.differs);
  const identicalCount = allFields.filter((row) => !row.differs).length;
  const sampleVisible = products.some((product) => product.isSampleData);

  useEffect(() => {
    if (!hasAi) return;
    const controller = new AbortController();
    void fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: schema.slug,
        priorities: priorityKey ? priorityKey.split(",") : [],
      }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => {
        const parsed = explanationResponse.safeParse(json);
        if (parsed.success) setAiSelection(parsed.data);
      })
      .catch(() => {
        /* Deterministic sourced explanations remain visible. */
      });
    return () => controller.abort();
  }, [hasAi, schema.slug, priorityKey]);

  function showSource(product: ComparableProduct, field: CoverageField, coverage?: CoverageValue) {
    if (!coverage?.evidence) return;
    setSource({
      title: field.labelFa,
      productName: `${product.nameFa} · ${product.insurerNameFa}`,
      evidence: coverage.evidence,
      sourceUrl: product.sourceUrl,
      isSampleData: product.isSampleData,
    });
  }
  function sourceButton(
    product: ComparableProduct,
    field: CoverageField,
    coverage?: CoverageValue,
    compact = false,
  ) {
    if (!coverage?.evidence) return null;
    return (
      <button
        type="button"
        onClick={() => showSource(product, field, coverage)}
        aria-label={`نمایش منبع ${field.labelFa} در ${product.nameFa}، ${product.insurerNameFa}`}
        className={`inline-flex shrink-0 items-center gap-1 rounded-md text-[#63707d] transition hover:text-brand ${compact ? "p-1" : "px-1 py-0.5 text-[11px]"}`}
      >
        <BookOpenText size={13} aria-hidden="true" />
        {!compact && "منبع"}
      </button>
    );
  }
  function toggleProduct(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.length > 2
          ? current.filter((item) => item !== slug)
          : current
        : current.length < 6
          ? [...current, slug]
          : current,
    );
  }
  function togglePriority(key: string) {
    setAiSelection(null);
    setPriorities((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }
  function reasonText(product: ComparableProduct, fact: FieldFact): string {
    const { field, coverage } = fact;
    const value = coverage.value;
    const state =
      typeof value === "boolean"
        ? value
          ? "پوشش دارد"
          : "ندارد"
        : `${formatValue(field, value)} است`;
    const distinct =
      new Set(products.map((item) => JSON.stringify(getCoverage(item, field.key)?.value ?? null)))
        .size > 1;
    const relative = relativeFieldScore(product, field, products);
    const impact =
      distinct && relative !== null && relative >= 0.75
        ? "در میان این طرح‌ها امتیاز بیشتری می‌گیرد"
        : distinct && relative !== null && relative <= 0.25
          ? "در مقایسه امتیاز کمی می‌گیرد"
          : "در امتیازدهی لحاظ شده است";
    return `«${field.labelFa}» ${state} و ${impact}.`;
  }
  function selectedFacts(product: ComparableProduct) {
    const defaultFacts = explanationFacts(product, schema, priorities, products);
    const chosen = aiSelection?.items.find((item) => item.productSlug === product.slug);
    if (!chosen) return defaultFacts;
    const fieldFact = (key: string | null): FieldFact | null => {
      const field = schema.fields.find((item) => item.key === key);
      const coverage = field ? getCoverage(product, field.key) : undefined;
      return field && coverage?.value !== null && coverage?.evidence ? { field, coverage } : null;
    };
    return {
      positive: fieldFact(chosen.positiveFieldKey) ?? defaultFacts.positive,
      limitation: fieldFact(chosen.limitationFieldKey) ?? defaultFacts.limitation,
    };
  }

  if (products.length < 2)
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <FileSearch className="mx-auto text-[#63707d]" size={35} aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold">هنوز طرح کافی برای مقایسه نیست</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          برای مقایسه به حداقل دو طرح با اطلاعات قابل بررسی نیاز داریم.
        </p>
        <Link href="/" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand">
          بازگشت به خانه <ArrowLeft size={16} aria-hidden="true" />
        </Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-8 pt-7 sm:px-8">
      <nav
        aria-label="مسیر صفحه"
        className="mb-7 flex items-center gap-2 text-[12px] text-[#63707d]"
      >
        <Link href="/" className="hover:text-brand">
          خانه
        </Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <span className="text-[#63707d]">مقایسه {schema.nameFa}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <TypeIcon type={schema.icon} size="large" />
          <div>
            <div className="mb-1 text-[12px] font-bold text-brand">مقایسه پوشش‌ها</div>
            <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[27px]">
              {schema.nameFa}
            </h1>
            <p className="mt-1 text-xs leading-6 text-[#63707d]">
              {faNumber(products.length)} طرح برای مقایسه کنار هم
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-[#e8ebee] bg-white px-4 py-3 text-xs font-bold text-[#63707d] hover:border-[#edbdc1] hover:text-brand"
        >
          تغییر نوع بیمه <ArrowLeft size={14} aria-hidden="true" />
        </Link>
      </div>
      {sampleVisible && (
        <div className="mt-7 flex items-start gap-3 rounded-xl border border-[#f4e5cf] bg-[#fffaf2] px-4 py-3.5 text-xs leading-6 text-[#8a5b38]">
          <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong>داده‌های نمونه و ساختگی:</strong> نام شرکت‌ها، طرح‌ها و پوشش‌های نمونه واقعی
            نیستند و این صفحه امکان خرید یا دریافت قیمت ندارد.
            {mode === "fallback" &&
              " داده‌های پایگاه داده در دسترس یا معتبر نبود؛ داده‌های نمونه نمایش داده می‌شوند."}
          </p>
        </div>
      )}
      <section
        aria-label="اولویت‌های مقایسه"
        className="mt-5 rounded-2xl border border-[#e9ecef] bg-white p-4 shadow-[0_3px_14px_rgba(35,45,60,.025)] sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf1f2] text-brand">
              <SearchCheck size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[13px] font-extrabold">
                {priorities.length ? "مقایسه بر اساس نیاز شما" : "مقایسه بر اساس پوشش‌ها"}
              </h2>
              <p className="mt-1 text-[12px] leading-6 text-[#63707d]">
                {priorities.length
                  ? "این اولویت‌ها در امتیازدهی وزن بیشتری دارند."
                  : "برای شخصی‌سازی ترتیب طرح‌ها، اولویت‌هایتان را انتخاب کنید."}
                {intentMode && (
                  <span> · تشخیص {intentMode === "ai" ? "با مدل" : "قانون‌محور"}</span>
                )}
              </p>
            </div>
          </div>
          <details className="group relative">
            <summary className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#eceef0] px-3 py-2 text-[12px] font-semibold text-[#63707d] hover:text-brand">
              <CircleHelp size={14} aria-hidden="true" /> روش امتیازدهی{" "}
              <ChevronDown size={13} aria-hidden="true" />
            </summary>
            <div className="absolute end-0 top-full z-20 mt-2 w-[280px] rounded-xl border border-[#e9ecef] bg-white p-4 text-[12px] leading-6 text-[#63707d] shadow-float">
              امتیاز نسبت به همه طرح‌های این صفحه محاسبه می‌شود. پوشش‌های انتخاب‌شده ۳ برابر وزن
              دارند، مقدار نامشخص صفر می‌گیرد و قیمت و اعتبار شرکت در نظر گرفته نمی‌شوند. اگر شرط
              الزامی وجود داشته باشد، ابتدا تعداد شرط‌های تأییدشده و سپس امتیاز ملاک ترتیب است. این
              امتیاز توصیه خرید نیست.
            </div>
          </details>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#f1f2f3] pt-4">
          <span className="me-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#63707d]">
            <ListFilter size={14} aria-hidden="true" /> اولویت‌ها:
          </span>
          {schema.fields
            .filter((field) => !field.isExclusion && field.kind !== "text")
            .map((field) => (
              <button
                key={field.key}
                type="button"
                aria-pressed={priorities.includes(field.key)}
                onClick={() => togglePriority(field.key)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${priorities.includes(field.key) ? "border-[#f1c2c6] bg-[#fff4f5] text-[#a34d55]" : "border-[#edf0f2] bg-[#fafbfc] text-[#63707d] hover:border-[#e7c7ca]"}`}
              >
                {priorities.includes(field.key) && (
                  <Check size={12} className="me-1 inline" aria-hidden="true" />
                )}
                {field.labelFa}
              </button>
            ))}
        </div>
        {constraints.length > 0 && (
          <div
            role="region"
            aria-label="شرط‌های الزامی پوشش"
            className="mt-4 rounded-xl border border-[#f1dcd9] bg-[#fffbfa] px-3 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-[#8a4d49]">شرط الزامی پوشش:</span>
              {constraints.map((constraint) => {
                const field = schema.fields.find((item) => item.key === constraint.fieldKey);
                return field ? (
                  <button
                    key={field.key}
                    type="button"
                    aria-label={`حذف شرط ${field.labelFa}`}
                    onClick={() =>
                      setConstraints((current) =>
                        current.filter((item) => item.fieldKey !== field.key),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-[#ead1cf] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#8a4d49] hover:border-brand"
                  >
                    {field.labelFa} <X size={12} aria-hidden="true" />
                  </button>
                ) : null;
              })}
            </div>
            <p className="mt-2 text-[11px] leading-6 text-[#63707d]">
              ترتیب ابتدا بر اساس تعداد شرط‌های تأییدشده است؛ بقیه نیز برای بررسی نمایش داده
              می‌شوند. مقدار نامشخص به معنی نبود پوشش نیست.
            </p>
          </div>
        )}
        {budget !== null && (
          <p className="mt-3 text-[12px] leading-6 text-[#8a5b38]">
            بودجه {formatMoney(budget)} ثبت شد؛ چون قیمت واقعی یا نمونه‌ای نداریم، در رتبه‌بندی
            اعمال نشده است.
          </p>
        )}
      </section>
      <section className="mt-10" aria-labelledby="ranking-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="mb-2 text-[12px] font-bold text-brand">اول یک نگاه کلی</div>
            <h2 id="ranking-title" className="text-lg font-extrabold sm:text-xl">
              طرح‌ها به ترتیب تناسب پوشش
            </h2>
            <p className="mt-1.5 text-[12px] leading-6 text-[#63707d]">
              امتیاز نسبی است، قیمت و اعتبار شرکت را نشان نمی‌دهد و توصیه خرید نیست.
            </p>
          </div>
          <span className="text-[11px] text-[#63707d]">
            {aiSelection?.mode === "ai"
              ? "انتخاب نکات با مدل؛ جمله‌ها از داده‌های مستند"
              : "توضیح‌ها از داده‌های مستند"}
          </span>
        </div>
        <div className="scrollbar-thin -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {ranked.map(
            ({ product, score, known, total, constraintsMet, constraintsTotal }, index) => {
              const facts = selectedFacts(product);
              const isSelected = selected.includes(product.slug);
              return (
                <article
                  key={product.slug}
                  className={`min-w-[252px] snap-start rounded-2xl border bg-white p-4 sm:min-w-[270px] lg:min-w-0 ${index === 0 ? "border-[#efc7cb] shadow-[0_7px_25px_rgba(223,56,69,.06)]" : "border-[#e9ecef]"}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold ${index === 0 ? "bg-[#fdf0f1] text-brand" : "bg-[#f5f6f7] text-[#63707d]"}`}
                    >
                      رتبه {faNumber(index + 1)}
                    </span>
                    {product.isSampleData && (
                      <span className="text-[11px] text-[#63707d]">نمونه</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f6f8] text-sm font-extrabold text-[#63707d]">
                      {product.insurerNameFa.replace("بیمه ", "").charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-[13px] font-extrabold">{product.nameFa}</h3>
                      <p className="mt-1 truncate text-[11px] text-[#63707d]">
                        {product.insurerNameFa}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-[#fafbfc] px-3 py-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#63707d]">
                      <span>امتیاز نسبی پوشش</span>
                      <span className="font-bold text-[#5e6875]">
                        <span className="text-[15px]">{faNumber(score)}</span> / ۱۰۰
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eceff1]">
                      <div
                        className={`h-full rounded-full ${index === 0 ? "bg-brand" : "bg-[#aebdc5]"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                  {constraintsTotal > 0 && (
                    <div className="mt-3 rounded-xl border border-[#f1dcd9] bg-[#fffbfa] px-3 py-2 text-[11px] leading-6 text-[#63707d]">
                      <p className="font-bold text-[#8a4d49]">
                        {faNumber(constraintsMet)} از {faNumber(constraintsTotal)} شرط تأیید شده
                      </p>
                      <ul>
                        {constraints.map((constraint) => {
                          const field = schema.fields.find(
                            (item) => item.key === constraint.fieldKey,
                          );
                          if (!field) return null;
                          const coverage = getCoverage(product, field.key);
                          const status =
                            coverage?.evidence && typeof coverage.value === "boolean"
                              ? coverage.value
                                ? "پوشش دارد"
                                : "پوشش ندارد"
                              : "نامشخص";
                          return (
                            <li key={field.key}>
                              {field.labelFa}: {status}{" "}
                              {sourceButton(product, field, coverage, true)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 min-h-[96px] space-y-2 text-[11px] leading-[1.9] text-[#63707d]">
                    {facts.positive ? (
                      <p>
                        {reasonText(product, facts.positive)}{" "}
                        {sourceButton(product, facts.positive.field, facts.positive.coverage, true)}
                      </p>
                    ) : (
                      <p>پوشش قابل استنادی برای توضیح این امتیاز ثبت نشده است.</p>
                    )}
                    {facts.limitation ? (
                      <p>
                        <span className="font-bold text-[#a34d55]">محدودیت:</span>{" "}
                        {factText(facts.limitation)}.{" "}
                        {sourceButton(
                          product,
                          facts.limitation.field,
                          facts.limitation.coverage,
                          true,
                        )}
                      </p>
                    ) : (
                      <p>محدودیتی در داده‌های موجود ثبت نشده؛ این به معنی نبود محدودیت نیست.</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#f2f3f4] pt-3">
                    <span className="text-[11px] text-[#63707d]">
                      {faNumber(known)} از {faNumber(total)} معیار مشخص
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#63707d]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isSelected && selected.length <= 2}
                        onChange={() => toggleProduct(product.slug)}
                        className="h-3.5 w-3.5 accent-[#d63342]"
                        aria-label={`مقایسه ${product.nameFa}، ${product.insurerNameFa}`}
                      />{" "}
                      مقایسه
                    </label>
                  </div>
                </article>
              );
            },
          )}
        </div>
        <p className="mt-2 text-[11px] text-[#63707d]">
          برای جدول، حداقل ۲ و حداکثر ۶ طرح انتخاب کنید.
        </p>
      </section>
      <section
        aria-labelledby="limitations-title"
        className="mt-10 rounded-[20px] border border-[#f3dedb] bg-[#fffbfa] p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0ed] text-[#a34d55]">
            <ShieldAlert size={21} aria-hidden="true" />
          </span>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#a34d55]">
              قبل از انتخاب، این بخش را ببین
            </div>
            <h2 id="limitations-title" className="text-lg font-extrabold">
              چه چیزهایی تحت پوشش نیست؟
            </h2>
            <p className="mt-1.5 text-[12px] leading-6 text-[#63707d]">
              چند استثنا و محدودیت مهم از متن هر طرح؛ ممکن است همه شرایط را شامل نشود.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {compared.map(({ product }) => {
            const limitations = limitationFacts(product, schema, priorities).slice(0, 2);
            return (
              <article
                key={product.slug}
                className="rounded-xl border border-[#f3e9e7] bg-white p-4"
              >
                <h3 className="text-xs font-extrabold text-[#535d68]">{product.nameFa}</h3>
                <p className="mt-1 text-[11px] text-[#63707d]">{product.insurerNameFa}</p>
                <div className="mt-3 space-y-3">
                  {limitations.length ? (
                    limitations.map((fact) => (
                      <div
                        key={fact.field.key}
                        className="flex items-start gap-2 text-[12px] leading-6 text-[#63707d]"
                      >
                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#df9a8d]" />
                        <p className="min-w-0">
                          {factText(fact)} {sourceButton(product, fact.field, fact.coverage)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] leading-6 text-[#63707d]">
                      محدودیتی ثبت نشده؛ این به معنی نبود محدودیت نیست.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="table-title" className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 text-[12px] font-bold text-brand">جزئیات، کنار هم</div>
            <h2 id="table-title" className="text-lg font-extrabold sm:text-xl">
              جدول مقایسه پوشش‌ها
            </h2>
            <p className="mt-1.5 text-[12px] leading-6 text-[#63707d]">
              برای دیدن متن پشتیبان، روی علامت منبع هر خانه بزنید.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[#63707d]">
            <input
              type="checkbox"
              checked={hideIdentical}
              onChange={(event) => setHideIdentical(event.target.checked)}
              className="h-4 w-4 accent-[#d63342]"
            />{" "}
            پنهان‌کردن ردیف‌های مشابه ({faNumber(identicalCount)})
          </label>
        </div>
        <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-[#e9ecef] bg-white">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-start">
            <caption className="sr-only">
              مقایسه پوشش‌های طرح‌های انتخاب‌شده. ردیف‌های متفاوت مشخص شده‌اند.
            </caption>
            <colgroup>
              <col style={{ width: "200px" }} />
              {compared.map(({ product }) => (
                <col key={product.slug} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[#fafbfc]">
                <th
                  scope="col"
                  className="sticky start-0 z-10 border-b border-e-[#edf0f2] border-[#edf0f2] bg-[#fafbfc] px-4 py-4 text-start text-[12px] font-bold text-[#63707d]"
                >
                  پوشش / شرایط
                </th>
                {compared.map(({ product }) => (
                  <th
                    key={product.slug}
                    scope="col"
                    className="border-b border-[#edf0f2] px-4 py-4 text-start"
                  >
                    <span className="block text-xs font-extrabold text-[#57616d]">
                      {product.nameFa}
                    </span>
                    <span className="mt-1 block text-[11px] font-normal text-[#63707d]">
                      {product.insurerNameFa}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleFields.map(({ field, differs }) => (
                <tr key={field.key} className={differs ? "bg-[#fffdfb]" : "bg-white"}>
                  <th
                    scope="row"
                    className={`sticky start-0 z-10 border-b border-e border-[#f0f2f3] px-4 py-4 text-start align-top ${differs ? "bg-[#fffdfb]" : "bg-white"}`}
                  >
                    <span className="block text-[12px] font-bold leading-6 text-[#63707d]">
                      {field.labelFa}
                    </span>
                    {differs && (
                      <span className="mt-1 inline-block rounded bg-[#fff3e8] px-1.5 py-0.5 text-[10px] font-semibold text-[#8a5b38]">
                        متفاوت
                      </span>
                    )}
                  </th>
                  {compared.map(({ product }) => {
                    const coverage = getCoverage(product, field.key);
                    const value = coverage?.value ?? null;
                    return (
                      <td
                        key={product.slug}
                        className="border-b border-[#f0f2f3] px-4 py-4 align-top text-[12px] leading-6 text-[#68727e]"
                      >
                        <div className="flex items-start gap-1.5">
                          {value === true ? (
                            <CheckCircle2
                              size={15}
                              className="mt-1 shrink-0 text-[#397354]"
                              aria-hidden="true"
                            />
                          ) : value === false ? (
                            <X
                              size={15}
                              className="mt-1 shrink-0 text-[#a34d55]"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span className={value === null ? "text-[#63707d]" : ""}>
                            {formatValue(field, value)}
                          </span>
                        </div>
                        {sourceButton(product, field, coverage)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleFields.length === 0 && (
            <p className="p-6 text-center text-xs text-[#63707d]">
              در طرح‌های انتخاب‌شده ردیف متفاوتی وجود ندارد.
            </p>
          )}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-6 text-[#63707d]">
          <Info size={14} aria-hidden="true" /> مقادیر «نامشخص» به معنی نداشتن پوشش نیستند. جدول در
          موبایل به طرفین جابه‌جا می‌شود.
        </p>
      </section>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#eceef0] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f7f8] text-[#63707d]">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold">این فقط شروع مقایسه است</p>
            <p className="mt-1 text-[11px] leading-5 text-[#63707d]">
              پیش از هر تصمیم، متن کامل بیمه‌نامه و شرایط واقعی را بررسی کنید.
            </p>
          </div>
        </div>
        <Link
          href="/evaluation"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand hover:text-brand-dark"
        >
          ارزیابی داده‌ها <ArrowLeft size={14} aria-hidden="true" />
        </Link>
      </div>
      {source && <SourceDialog source={source} onClose={() => setSource(null)} />}
    </main>
  );
}
