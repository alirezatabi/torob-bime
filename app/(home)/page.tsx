import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpenCheck,
  GitCompareArrows,
  ScanSearch,
  ShieldAlert,
} from "lucide-react";
import { IntentSearch } from "@/components/intent-search";
import { HeroPreview } from "@/components/hero-preview";
import { TypeIcon } from "@/components/type-icon";
import { activeSchemas } from "@/lib/schemas/registry";
import { faNumber } from "@/lib/domain/format";
import { aiConfigured } from "@/lib/ai/extraction";
import products from "@/fixtures/products.json";

export const dynamic = "force-dynamic";

const steps = [
  { icon: ScanSearch, title: "نیازت رو بگو", text: "به زبان خودت بگو دنبال چه پوششی هستی." },
  {
    icon: GitCompareArrows,
    title: "کنار هم مقایسه کن",
    text: "تفاوت پوشش‌ها و شرایط را یک‌جا ببین.",
  },
  {
    icon: ShieldAlert,
    title: "حواست به استثناها باشه",
    text: "بفهم کدام خسارت‌ها تحت پوشش نیستند.",
  },
];
export default function HomePage() {
  return (
    <main>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <section className="grid items-center gap-16 pb-16 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-20 lg:pb-24 lg:pt-[90px]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f4dfe0] bg-[#fff6f6] px-3 py-1.5 text-[12px] font-bold text-[#a34d55]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> انتخاب آگاهانه، نه فقط
              ارزان‌ترین
            </div>
            <h1 className="text-[32px] font-extrabold leading-[1.65] tracking-[-.03em] text-[#252c35] sm:text-[42px] lg:text-[47px]">
              انتخاب بیمه،
              <br />
              <span className="text-brand">این‌بار با چشمِ باز.</span>
            </h1>
            <p className="mb-8 mt-4 max-w-[520px] text-[14px] leading-[2.2] text-[#63707d] sm:text-[15px]">
              پوشش‌ها و محدودیت‌های بیمه‌ها رو کنار هم ببین؛ قبل از انتخاب، از چیزهایی که تحت پوشش
              نیستند هم باخبر شو.
            </p>
            <IntentSearch aiEnabled={aiConfigured()} />
          </div>
          <div className="px-4 pb-4 pt-3 lg:px-0">
            <HeroPreview />
          </div>
        </section>
        <section
          id="insurance-types"
          className="scroll-mt-8 border-t border-[#edf0f2] pb-16 pt-10 sm:pt-12"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 text-[12px] font-bold text-brand">از اینجا شروع کن</div>
              <h2 className="text-xl font-extrabold tracking-tight sm:text-[23px]">
                دنبال چه بیمه‌ای هستی؟
              </h2>
              <p className="mt-2 text-xs leading-6 text-[#63707d]">
                یکی از دسته‌ها رو انتخاب کن و مقایسه رو شروع کن.
              </p>
            </div>
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63707d] hover:text-brand"
            >
              بیمه‌های بیشتر در راه‌اند <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {activeSchemas.map((schema) => (
              <Link
                key={schema.slug}
                href={`/compare/${schema.slug}`}
                className="group relative flex min-h-[166px] flex-col rounded-[18px] border border-[#e9ecef] bg-white p-5 shadow-[0_3px_12px_rgba(35,45,60,.025)] transition duration-200 hover:-translate-y-1 hover:border-[#efc6c9] hover:shadow-card"
              >
                <div className="flex items-start justify-between">
                  <TypeIcon type={schema.icon} size="large" />
                  <ArrowUpLeft
                    size={18}
                    className="text-[#63707d] transition group-hover:text-brand"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[#303843]">{schema.nameFa}</h3>
                    <p className="mt-1.5 text-[12px] leading-5 text-[#63707d]">
                      {schema.descriptionFa}
                    </p>
                  </div>
                </div>
                <span className="mt-3 text-[11px] font-medium text-[#63707d]">
                  {faNumber(products.filter((product) => product.typeSlug === schema.slug).length)}{" "}
                  طرح نمونه
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section
          id="how-it-works"
          className="scroll-mt-8 rounded-[24px] border border-[#eff0f2] bg-white px-6 py-9 sm:px-10 sm:py-11"
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 text-[12px] font-bold text-brand">ساده و شفاف</div>
              <h2 className="text-xl font-extrabold sm:text-[23px]">از سؤال تا انتخاب، سه قدم</h2>
              <p className="mt-2 text-xs leading-6 text-[#63707d]">
                لازم نیست برای فهمیدن تفاوت بیمه‌ها، همه بیمه‌نامه‌ها رو بخونی.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-[12px] text-[#63707d]">
              <BookOpenCheck size={16} aria-hidden="true" /> همراه با منبع هر پوشش
            </span>
          </div>
          <div className="mt-9 grid gap-7 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="flex gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8f8f9] text-[#63707d]">
                  <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[13px] font-bold">
                    <span className="me-2 text-[11px] text-[#a34d55]">{faNumber(index + 1)}.</span>
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-6 text-[#63707d]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
