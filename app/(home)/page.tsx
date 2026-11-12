import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpenText,
  Info,
  Layers3,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { IntentSearch } from "@/components/intent-search";
import { HeroPreview } from "@/components/hero-preview";
import { TypeIcon } from "@/components/type-icon";
import { Badge } from "@/components/ui/surfaces";
import { LinkStatus } from "@/components/ui/link-status";
import { getCatalogue } from "@/lib/data/catalog";
import { activeSchemas } from "@/lib/schemas/registry";
import { faNumber } from "@/lib/domain/format";
import { aiConfigured } from "@/lib/ai/anthropic";

export default async function HomePage() {
  const catalogues = await Promise.all(activeSchemas.map((schema) => getCatalogue(schema.slug)));
  const hero = catalogues.find((catalogue) => catalogue?.schema.slug === "car-body");
  const products = catalogues.flatMap((catalogue) => catalogue?.products ?? []);
  const hasSamples = products.some((product) => product.isSampleData);
  const onlySamples = products.length > 0 && products.every((product) => product.isSampleData);
  return (
    <main>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <section className="grid items-center gap-12 pb-16 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-20 lg:pb-24 lg:pt-14">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-brand-strong">
              <span className="h-2 w-2 rounded-full bg-brand" /> موتور مقایسه بیمه · پروژه نمایشی
              مستقل
            </div>
            <h1 className="text-[32px] font-extrabold leading-[1.65] text-text sm:text-[40px] lg:text-[46px]">
              مقایسه بیمه،
              <br />
              <span className="text-brand-strong">روشن و قابل بررسی.</span>
            </h1>
            <p className="mt-3 max-w-[560px] text-base leading-8 text-text-muted">
              نیازتان را بگویید؛ پوشش‌ها و موارد بدون پوشش را کنار هم ببینید و منبع هر مقدار را
              بررسی کنید.
            </p>
            {hasSamples && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs leading-7 text-warning">
                <Info size={17} className="mt-1 shrink-0" aria-hidden="true" />
                {onlySamples
                  ? "شرکت‌ها، طرح‌ها و حق‌بیمه‌ها در این نسخه ساختگی‌اند؛ قیمت واقعی نیستند."
                  : "طرح‌های دارای برچسب «نمونه» و حق‌بیمه‌هایشان ساختگی‌اند؛ قیمت واقعی نیستند."}
              </p>
            )}
            <div className="mt-5">
              <IntentSearch aiEnabled={aiConfigured()} />
            </div>
          </div>
          {hero && (
            <div className="px-4 pb-4 pt-3 lg:px-0">
              <HeroPreview schema={hero.schema} products={hero.products} />
            </div>
          )}
        </section>
        <section id="insurance-types" className="scroll-mt-8 border-t border-border pb-16 pt-12">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-brand-strong">از اینجا شروع کنید</p>
              <h2 className="mt-2 text-2xl font-extrabold">به دنبال چه بیمه‌ای هستید؟</h2>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                یک دسته را انتخاب کنید و پوشش طرح‌ها را مقایسه کنید؛ طرح‌های نمونه مشخص‌اند.
              </p>
            </div>
            <Link
              href="/roadmap"
              className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-text-muted hover:text-brand-strong"
            >
              دسته‌های بیشتر در نقشه راه <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {catalogues.map(
              (catalogue) =>
                catalogue && (
                  <Link
                    key={catalogue.schema.slug}
                    href={`/compare/${catalogue.schema.slug}`}
                    className="group flex min-h-[190px] flex-col justify-between rounded-3xl border border-border bg-surface-raised p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand hover:shadow-float"
                  >
                    <div className="flex items-start justify-between">
                      <TypeIcon type={catalogue.schema.icon} size="large" />
                      <ArrowUpLeft
                        size={20}
                        className="text-text-muted transition group-hover:text-brand-strong"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold">{catalogue.schema.nameFa}</h3>
                        {catalogue.products.length > 0 &&
                          catalogue.products.every((product) => product.isSampleData) && (
                            <Badge tone="warning">نمونه</Badge>
                          )}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-text-muted">
                        {catalogue.schema.descriptionFa}
                      </p>
                      <p className="mt-3 text-xs font-bold text-brand-strong">
                        {faNumber(catalogue.products.length)} طرح
                        {catalogue.products.length > 0 &&
                        catalogue.products.every((product) => product.isSampleData)
                          ? " نمونه"
                          : ""}{" "}
                        ←
                      </p>
                      <LinkStatus />
                    </div>
                  </Link>
                ),
            )}
          </div>
        </section>
        <section
          id="how-it-works"
          className="scroll-mt-8 rounded-3xl border border-border bg-surface-raised p-6 shadow-card sm:p-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-brand-strong">ساده و شفاف</p>
              <h2 className="mt-2 text-2xl font-extrabold">از یک سؤال تا مقایسه‌ای روشن</h2>
              <p className="mt-2 text-sm text-text-muted">
                هر مرحله را می‌توانید بررسی و اصلاح کنید.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-success">
              <ShieldCheck size={18} aria-hidden="true" /> هر عدد، یک منبع
            </span>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl bg-surface-muted p-5">
              <ScanSearch className="text-brand-strong" size={22} aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold">۱. نیازتان را بنویسید</h3>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                نوع بیمه و اولویت‌های تشخیص‌داده‌شده را پیش از ادامه تأیید کنید.
              </p>
              <span className="mt-4 inline-flex rounded-lg bg-surface-raised px-3 py-2 text-xs text-text-muted">
                برای سفر پوشش درمان می‌خواهم...
              </span>
            </article>
            <article className="rounded-2xl bg-surface-muted p-5">
              <Layers3 className="text-info" size={22} aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold">۲. پوشش‌ها را کنار هم ببینید</h3>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                مقادیر و موارد بدون پوشش را همراه با امتیاز نسبی مقایسه کنید.
              </p>
              <div className="mt-4 flex gap-2">
                <Badge tone="success">پوشش دارد</Badge>
                <Badge tone="danger">پوشش ندارد</Badge>
              </div>
            </article>
            <article className="rounded-2xl bg-surface-muted p-5">
              <BookOpenText className="text-success" size={22} aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold">۳. متن پشتیبان را بخوانید</h3>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                منبع هر مقدار مشخص را باز کنید؛ نقل‌قول به‌تنهایی جای متن کامل را نمی‌گیرد.
              </p>
              <span className="mt-4 inline-flex rounded-lg bg-surface-raised px-3 py-2 text-xs font-bold text-success">
                نقل‌قول از متن نمونه
              </span>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
