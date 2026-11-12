"use client";
import { useMemo, useState, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Check, Copy, ShieldAlert, X } from "lucide-react";
import { faNumber, formatMoney, formatValue } from "@/lib/domain/format";
import { getCoverage, limitationFacts, isNonCoverage, rankProducts } from "@/lib/domain/ranking";
import { readComparisonState, type ComparisonState } from "@/lib/domain/comparison-query";
import { toLatinDigits } from "@/lib/domain/text";
import type {
  ComparableProduct,
  CoverageField,
  CoverageValue,
  InsuranceSchema,
} from "@/lib/schemas/contracts";
import { TypeIcon } from "./type-icon";
import { SourceDialog, type SourceDialogData } from "./source-dialog";
import { PlanCard } from "./plan-card";
import { ComparisonTable } from "./comparison-table";
import { EvidenceButton, type SourceHandler } from "./evidence-button";
import { Badge, Chip, Disclosure, Toast } from "./ui/surfaces";
import { Button, IconButton } from "./ui/button";

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
// Next's router can batch consecutive popstate transitions. Subscribe to the
// actual browser URL as well, so Back/Forward never leaves the controls stale.
const queryChange = "torob-comparison-query-change";
function subscribeQuery(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(queryChange, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(queryChange, onChange);
  };
}
function browserQuery() {
  return window.location.search.slice(1);
}
type Props = {
  schema: InsuranceSchema;
  products: ComparableProduct[];
  catalogueNotice: ReactNode;
  initial: ComparisonState;
  hasAi: boolean;
};
export function ComparisonExperience({ schema, products, catalogueNotice, initial, hasAi }: Props) {
  const search = useSearchParams();
  const pathname = usePathname();
  const queryKey = useSyncExternalStore(
    subscribeQuery,
    browserQuery,
    () => search?.toString() ?? "",
  );
  const state = useMemo(
    () => (search ? readComparisonState(new URLSearchParams(queryKey), schema, products) : initial),
    [queryKey, schema, products, search, initial],
  );
  const { priorities, constraints, selected, budget } = state;
  const [hideIdentical, setHideIdentical] = useState(false);
  const [source, setSource] = useState<SourceDialogData | null>(null);
  const [notice, setNotice] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [aiSelection, setAiSelection] = useState<z.infer<typeof explanationResponse> | null>(null);
  const priorityKey = [...priorities].sort().join(",");
  const ranked = useMemo(
    () => rankProducts(products, schema, priorities, constraints),
    [products, schema, priorities, constraints],
  );
  const compared = selected.flatMap((slug) => {
    const item = ranked.find(({ product }) => product.slug === slug);
    return item ? [item] : [];
  });
  const rows = schema.fields.map((field) => ({
    field,
    differs:
      new Set(
        compared.map(({ product }) =>
          JSON.stringify(getCoverage(product, field.key)?.value ?? null),
        ),
      ).size > 1,
  }));

  useEffect(() => {
    if (!hasAi) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
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
        .then((body: unknown) => {
          const parsed = explanationResponse.safeParse(body);
          if (parsed.success) setAiSelection(parsed.data);
        })
        .catch(() => {
          /* Deterministic facts remain visible. */
        });
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [hasAi, schema.slug, priorityKey]);

  // Native history integrates with Next's router without a server round-trip and preserves Back.
  function changeQuery(key: "priorities" | "required" | "compare" | "budget", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    window.history.pushState(null, "", `${pathname}${next ? `?${next}` : ""}`);
    window.dispatchEvent(new Event(queryChange));
  }
  function togglePriority(key: string) {
    const current = readComparisonState(
      new URLSearchParams(window.location.search),
      schema,
      products,
    ).priorities;
    setAiSelection(null);
    changeQuery(
      "priorities",
      (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]).join(
        ",",
      ),
    );
  }
  function removeConstraint(key: string) {
    const current = readComparisonState(
      new URLSearchParams(window.location.search),
      schema,
      products,
    ).constraints;
    changeQuery(
      "required",
      current
        .filter((item) => item.fieldKey !== key)
        .map((item) => item.fieldKey)
        .join(","),
    );
  }
  function toggleProduct(slug: string) {
    const current = readComparisonState(
      new URLSearchParams(window.location.search),
      schema,
      products,
    ).selected;
    const next = current.includes(slug)
      ? current.length > 2
        ? current.filter((item) => item !== slug)
        : current
      : current.length < 6
        ? [...current, slug]
        : current;
    if (next !== current) changeQuery("compare", next.join(","));
  }
  const showSource: SourceHandler = (
    product: ComparableProduct,
    field: CoverageField,
    coverage?: CoverageValue,
  ) => {
    if (!coverage?.evidence) return;
    setSource({
      title: field.labelFa,
      productName: `${product.nameFa} · ${product.insurerNameFa}`,
      evidence: coverage.evidence,
      context: product.evidenceContext?.[field.key],
      value: formatValue(field, coverage.value),
      confidence: coverage.confidence,
      provenance: product.provenance,
      sourceUrl: product.sourceUrl,
      isSampleData: product.isSampleData,
    });
  };
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("پیوند مقایسه کپی شد.");
    } catch {
      setNotice("کپی خودکار ممکن نبود؛ نشانی مرورگر را کپی کنید.");
    }
  }
  return (
    <>
      <div className="sticky top-0 z-20 -mx-5 border-y border-border bg-surface-raised/95 px-5 py-3 shadow-card backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TypeIcon type={schema.icon} />
            <div>
              <p className="text-xs font-bold text-brand-strong">مقایسه پوشش‌ها</p>
              <h1 className="text-lg font-extrabold sm:text-xl">{schema.nameFa}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="warning">
              {faNumber(products.length)} طرح
              {products.every((product) => product.isSampleData) ? " نمونه" : ""}
            </Badge>
            <Button variant="secondary" onClick={() => void copyLink()} className="text-xs">
              <Copy size={16} aria-hidden="true" /> کپی پیوند مقایسه
            </Button>
          </div>
        </div>
        {notice && <Toast>{notice}</Toast>}
        {priorities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
            <span>اولویت شما:</span>
            {priorities.map((key) => {
              const field = schema.fields.find((item) => item.key === key);
              return field ? (
                <button
                  key={key}
                  onClick={() => togglePriority(key)}
                  aria-label={`حذف اولویت ${field.labelFa}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-brand-soft px-2 text-xs font-bold text-brand-strong"
                >
                  {field.labelFa}
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>
      {catalogueNotice}
      <section
        aria-label="اولویت‌های مقایسه"
        className="mt-5 rounded-3xl border border-border bg-surface-raised p-5 shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold">مقایسه بر اساس نیاز شما</h2>
            <p className="mt-1 text-xs leading-6 text-text-muted">
              اولویت‌های انتخاب‌شده در امتیازدهی پوشش سه برابر وزن دارند.
            </p>
          </div>
          <Disclosure title="روش امتیازدهی">
            امتیاز پوشش نسبت به طرح‌های همین صفحه محاسبه می‌شود. مقدار نامشخص صفر می‌گیرد؛ شرط‌های
            تأییدشده پیش از امتیاز در ترتیب نقش دارند. حق‌بیمه نمونه در امتیاز پوشش و هیچ اعتبارسنجی
            شرکت لحاظ نمی‌شود. امتیاز توصیه خرید نیست.
          </Disclosure>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {schema.fields
            .filter((field) => !field.isExclusion && !field.isPremium && field.kind !== "text")
            .map((field) => (
              <Chip
                key={field.key}
                active={priorities.includes(field.key)}
                onClick={() => togglePriority(field.key)}
              >
                {priorities.includes(field.key) && <Check size={15} aria-hidden="true" />}
                {field.labelFa}
              </Chip>
            ))}
        </div>
        {constraints.length > 0 && (
          <div
            role="region"
            aria-label="شرط‌های الزامی پوشش"
            className="mt-4 rounded-2xl bg-warning-soft p-4"
          >
            <p className="text-xs font-bold text-warning">شرط الزامی پوشش</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {constraints.map(({ fieldKey }) => {
                const field = schema.fields.find((item) => item.key === fieldKey);
                return field ? (
                  <button
                    key={fieldKey}
                    aria-label={`حذف شرط ${field.labelFa}`}
                    onClick={() => removeConstraint(fieldKey)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 text-xs font-bold text-warning"
                  >
                    {field.labelFa}
                    <X size={15} aria-hidden="true" />
                  </button>
                ) : null;
              })}
            </div>
            <p className="mt-2 text-xs leading-6 text-warning">
              ابتدا تعداد شرط‌های تأییدشده سنجیده می‌شود؛ نامشخص به معنی نبود پوشش نیست.
            </p>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const raw = String(new FormData(event.currentTarget).get("budget") ?? "");
            const normalized = toLatinDigits(raw).replace(/[٬,\s]/g, "");
            const amount = Number(normalized);
            if (
              !/^\d{1,13}$/.test(normalized) ||
              !Number.isSafeInteger(amount) ||
              amount <= 0 ||
              amount > 1_000_000_000_000
            ) {
              setBudgetError("بودجه سالانه را به صورت عددی بزرگ‌تر از صفر وارد کنید.");
              return;
            }
            setBudgetError("");
            changeQuery("budget", String(amount));
          }}
          className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-4"
        >
          <label className="min-w-[190px] flex-1 text-xs font-bold text-text-muted">
            بودجه سالانه برای مقایسه نمونه (تومان)
            <input
              key={budget ?? "empty"}
              name="budget"
              inputMode="numeric"
              defaultValue={budget ?? ""}
              placeholder="اختیاری"
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text"
            />
          </label>
          <Button variant="secondary" type="submit">
            اعمال بودجه
          </Button>
          {budget !== null && (
            <Button
              variant="ghost"
              onClick={() => {
                setBudgetError("");
                changeQuery("budget", "");
              }}
            >
              حذف بودجه
            </Button>
          )}
          <p className="w-full text-xs leading-6 text-text-muted">
            {budget !== null
              ? `بودجه ${formatMoney(budget)} با حق‌بیمه‌های سالانه ساختگی سنجیده می‌شود. `
              : ""}
            این مبلغ در پیوند قابل اشتراک قرار می‌گیرد و هیچ قیمت واقعی نیست.
          </p>
          {budgetError && (
            <p role="alert" className="w-full text-xs text-danger">
              {budgetError}
            </p>
          )}
        </form>
      </section>
      <section aria-labelledby="ranking-title" className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-brand-strong">یک نگاه کلی</p>
            <h2 id="ranking-title" className="mt-1 text-2xl font-extrabold">
              طرح‌ها به ترتیب تناسب پوشش
            </h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              امتیاز نسبی پوشش، نه توصیه خرید یا اعتبار شرکت است.
            </p>
          </div>
          <span className="text-xs text-text-muted">
            {aiSelection?.mode === "ai"
              ? "انتخاب نکات با مدل؛ مقادیر از متن مستند"
              : "انتخاب نکات قانون‌محور از داده‌های مستند"}
          </span>
        </div>
        <div className="scrollbar-thin -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {ranked.map((item, index) => {
            const chosen = aiSelection?.items.find((row) => row.productSlug === item.product.slug);
            return (
              <PlanCard
                key={item.product.slug}
                ranked={item}
                index={index}
                schema={schema}
                priorities={priorities}
                selected={selected.includes(item.product.slug)}
                selectionCount={selected.length}
                budget={budget}
                onToggle={toggleProduct}
                onSource={showSource}
                preferredKeys={[chosen?.positiveFieldKey, chosen?.limitationFieldKey].filter(
                  (key): key is string => Boolean(key),
                )}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          برای جدول، حداقل ۲ و حداکثر ۶ طرح انتخاب کنید.
        </p>
      </section>
      <section
        aria-labelledby="limitations-title"
        className="mt-12 rounded-3xl border border-border bg-danger-soft p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-danger">
            <ShieldAlert size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-danger">پیش از انتخاب، این بخش را بررسی کنید</p>
            <h2 id="limitations-title" className="mt-1 text-xl font-extrabold">
              چه چیزهایی تحت پوشش نیست؟
            </h2>
            <p className="mt-2 text-xs leading-6 text-text-muted">
              نمونه‌ای از استثناها و محدودیت‌های ثبت‌شده؛ ممکن است همه شرایط را شامل نشود.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {compared.map(({ product }) => (
            <article
              key={product.slug}
              className="rounded-2xl border border-border bg-surface-raised p-4"
            >
              <h3 className="text-sm font-extrabold">{product.nameFa}</h3>
              <p className="text-xs text-text-muted">{product.insurerNameFa}</p>
              {limitationFacts(product, schema, priorities)
                .filter(isNonCoverage)
                .slice(0, 2)
                .map(({ field, coverage }) => (
                  <div key={field.key} className="mt-2 flex items-center gap-1 text-xs leading-6">
                    <span className="flex-1">
                      {field.isExclusion
                        ? String(coverage.value)
                        : `${field.labelFa}: ${formatValue(field, coverage.value)}`}
                    </span>
                    <EvidenceButton
                      product={product}
                      field={field}
                      coverage={coverage}
                      onSource={showSource}
                      compact
                    />
                  </div>
                ))}
            </article>
          ))}
        </div>
      </section>
      <ComparisonTable
        schema={schema}
        compared={compared}
        rows={rows}
        hideIdentical={hideIdentical}
        setHideIdentical={setHideIdentical}
        onToggle={toggleProduct}
        onSource={showSource}
      />
      <section
        aria-labelledby="value-title"
        className="mt-12 rounded-3xl border border-border bg-surface-raised p-5 shadow-card sm:p-6"
      >
        <h2 id="value-title" className="text-xl font-extrabold">
          پوشش در برابر حق‌بیمه نمونه
        </h2>
        <p className="mt-2 text-xs leading-6 text-text-muted">
          برای تمرین مقایسه، امتیاز پوشش و مبلغ ساختگی سالانه را کنار هم ببینید؛ این اعداد قیمت
          واقعی یا پیشنهاد خرید نیستند.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ranked.map(({ product, score }) => {
            const field = schema.fields.find((item) => item.isPremium);
            const coverage = field ? getCoverage(product, field.key) : undefined;
            return (
              <div
                key={product.slug}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted p-3 text-xs"
              >
                <strong>
                  {product.nameFa} · {product.insurerNameFa}
                </strong>
                <span>
                  {faNumber(score)}٪ پوشش نسبی /{" "}
                  {field ? formatValue(field, coverage?.value ?? null) : "نامشخص"} نمونه
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-raised p-3 shadow-float md:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2">
          <div className="scrollbar-thin flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {compared.map(({ product }) => (
              <span
                key={product.slug}
                className="inline-flex shrink-0 items-center rounded-xl bg-surface-muted ps-2 text-xs font-bold"
              >
                {product.nameFa}
                <IconButton
                  label={`حذف ${product.nameFa}، ${product.insurerNameFa} از سینی`}
                  disabled={selected.length <= 2}
                  onClick={() => toggleProduct(product.slug)}
                >
                  <X size={15} aria-hidden="true" />
                </IconButton>
              </span>
            ))}
          </div>
          <Button
            onClick={() =>
              document.getElementById("table-title")?.scrollIntoView({ behavior: "smooth" })
            }
            className="shrink-0 text-xs"
          >
            مقایسه ({faNumber(selected.length)})
          </Button>
        </div>
      </div>
      {source && <SourceDialog source={source} onClose={() => setSource(null)} />}
    </>
  );
}
