import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  Download,
  FlaskConical,
  Info,
  ListChecks,
} from "lucide-react";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { faNumber } from "@/lib/domain/format";

export const dynamic = "force-dynamic";
const summarySchema = z.object({
  mode: z.enum(["live-anthropic", "offline-structured-parser"]),
  generatedAt: z.string(),
  extractionCases: z.number(),
  valuesChecked: z.number(),
  fieldAccuracy: z.number(),
  groundingRate: z.number(),
  rawGrounded: z.number(),
  rawNonNull: z.number(),
  intentCases: z.number(),
  intentAccuracy: z.number(),
  priorityExactAccuracy: z.number(),
  failures: z.array(z.string()),
  fieldBreakdown: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      correct: z.number(),
      total: z.number(),
      accuracy: z.number(),
    }),
  ),
});

export default async function EvaluationPage() {
  let summary: z.infer<typeof summarySchema>;
  try {
    summary = summarySchema.parse(JSON.parse(await readFile("fixtures/eval-summary.json", "utf8")));
  } catch {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-xl font-extrabold">گزارش ارزیابی در دسترس نیست</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          برای ساخت گزارش، ابتدا دستور <code dir="ltr">pnpm eval</code> را اجرا کنید.
        </p>
        <Link href="/" className="mt-5 inline-block text-sm font-bold text-brand">
          بازگشت به خانه
        </Link>
      </main>
    );
  }
  const live = summary.mode === "live-anthropic";
  const metrics = [
    {
      label: "درستی مقادیر پوشش",
      value: `${faNumber(summary.fieldAccuracy)}٪`,
      detail: `${faNumber(summary.valuesChecked)} مقدار برچسب‌خورده`,
    },
    {
      label: "نقل‌قول موجود در منبع",
      value: `${faNumber(summary.groundingRate)}٪`,
      detail: `${faNumber(summary.rawGrounded)} از ${faNumber(summary.rawNonNull)} خروجی غیرخالی`,
    },
    {
      label: "تشخیص نوع بیمه",
      value: `${faNumber(summary.intentAccuracy)}٪`,
      detail: `${faNumber(summary.intentCases)} درخواست فارسی`,
    },
    {
      label: "تشخیص دقیق اولویت‌ها",
      value: `${faNumber(summary.priorityExactAccuracy)}٪`,
      detail: "تطابق مجموعه اولویت‌ها",
    },
  ];
  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-8 pt-7 sm:px-8">
      <nav
        aria-label="مسیر صفحه"
        className="mb-8 flex items-center gap-2 text-[12px] text-[#63707d]"
      >
        <Link href="/" className="hover:text-brand">
          خانه
        </Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <span className="text-[#63707d]">ارزیابی</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff2f3] px-3 py-1.5 text-[12px] font-bold text-brand">
            <BarChart3 size={14} aria-hidden="true" /> پشت صحنه مقایسه
          </span>
          <h1 className="mt-5 text-[28px] font-extrabold tracking-tight sm:text-[34px]">
            نتیجه‌ها را بی‌پرده ببینیم
          </h1>
          <p className="mt-3 text-sm leading-8 text-[#63707d]">
            آخرین اجرای ثبت‌شده روی {faNumber(summary.extractionCases)} متن ساختگی جدا از کاتالوگ و{" "}
            {faNumber(summary.intentCases)} درخواست فارسی. این آزمون کوچک جای بررسی کارشناس بیمه را
            نمی‌گیرد.
          </p>
        </div>
        <a
          href="/api/eval-report"
          download="EVAL_REPORT.md"
          className="inline-flex items-center gap-2 rounded-xl border border-[#e7eaed] bg-white px-4 py-3 text-xs font-bold text-[#63707d] hover:border-[#edbdc1] hover:text-brand"
        >
          <Download size={15} aria-hidden="true" /> گزارش کامل
        </a>
      </div>
      <div className="mt-7 flex items-start gap-3 rounded-xl border border-[#f4e5cf] bg-[#fffaf2] px-4 py-4 text-xs leading-7 text-[#8a5b38]">
        <FlaskConical size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <strong>
            {live ? "ارزیابی مدل Anthropic:" : "ارزیابی آفلاین، نه ارزیابی مدل زبانی:"}
          </strong>{" "}
          {live
            ? "این اعداد مربوط به آخرین اجرای ثبت‌شده با مدل تنظیم‌شده‌اند."
            : "اعداد زیر حاصل تحلیل‌گر قانون‌محور و متن‌های نمونه‌اند؛ نمی‌توان آن‌ها را به عملکرد هوش مصنوعی روی بیمه‌نامه‌های واقعی تعمیم داد."}
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-[#e9ecef] bg-white p-5">
            <p className="text-[12px] font-semibold text-[#63707d]">{metric.label}</p>
            <p className="mt-4 text-[27px] font-extrabold text-[#414b56]">{metric.value}</p>
            <p className="mt-1.5 text-[11px] text-[#63707d]">{metric.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <section className="rounded-[20px] border border-[#e9ecef] bg-white p-6">
          <div className="flex items-center gap-2">
            <ListChecks size={19} className="text-brand" aria-hidden="true" />
            <h2 className="text-sm font-extrabold">خطاهای ثبت‌شده</h2>
            <span className="ms-auto rounded-md bg-[#f7f8f9] px-2 py-1 text-[11px] text-[#63707d]">
              {faNumber(summary.failures.length)} مورد
            </span>
          </div>
          <p className="mt-3 text-[12px] leading-6 text-[#63707d]">
            خطاها پنهان نمی‌شوند؛ متن‌های بدون قالب مشخص به‌ویژه برای روش آفلاین دشوارند.
          </p>
          {summary.failures.length ? (
            <ul
              tabIndex={0}
              aria-label="فهرست خطاهای ارزیابی"
              className="mt-4 max-h-[325px] space-y-2 overflow-auto"
              dir="ltr"
            >
              {summary.failures.map((failure, index) => (
                <li
                  key={`${failure}-${index}`}
                  className="rounded-lg bg-[#fafbfc] px-3 py-2 text-left text-[11px] leading-5 text-[#63707d]"
                >
                  {failure}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-[#397354]">در این مجموعه کوچک خطایی ثبت نشد.</p>
          )}
        </section>
        <section className="rounded-[20px] border border-[#e9ecef] bg-white p-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={19} className="text-brand" aria-hidden="true" />
            <h2 className="text-sm font-extrabold">دقت به تفکیک پوشش</h2>
          </div>
          <p className="mt-3 text-[12px] leading-6 text-[#63707d]">
            شامل موارد «نامشخص»؛ تعداد نمونه هر پوشش کم است.
          </p>
          <div
            tabIndex={0}
            role="region"
            aria-label="جدول دقت پوشش‌ها"
            className="mt-4 max-h-[325px] overflow-auto"
          >
            <table className="w-full text-start text-[12px]">
              <caption className="sr-only">دقت به تفکیک فیلد بیمه</caption>
              <thead className="sticky top-0 bg-white text-[#63707d]">
                <tr>
                  <th className="pb-3 text-start font-medium">پوشش</th>
                  <th className="pb-3 text-start font-medium">درست / کل</th>
                  <th className="pb-3 text-end font-medium">دقت</th>
                </tr>
              </thead>
              <tbody>
                {summary.fieldBreakdown.map((field) => (
                  <tr key={field.key} className="border-t border-[#f2f3f4]">
                    <td className="py-2.5 text-[#63707d]">
                      {field.label}
                      <span className="ms-1 text-[10px] text-[#63707d]" dir="ltr">
                        ({field.key.split(".")[0]})
                      </span>
                    </td>
                    <td className="text-[#63707d]">
                      {faNumber(field.correct)} / {faNumber(field.total)}
                    </td>
                    <td className="text-end font-semibold text-[#63707d]">
                      {faNumber(field.accuracy)}٪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="mt-5 flex items-start gap-2 text-[11px] leading-6 text-[#63707d]">
        <Info size={15} className="mt-1 shrink-0" aria-hidden="true" /> وجود نقل‌قول در متن،
        به‌تنهایی صحت معنایی برداشت را اثبات نمی‌کند. تاریخ آخرین اجرا:{" "}
        <span dir="ltr">{summary.generatedAt.slice(0, 10)}</span>
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-brand hover:text-brand-dark"
      >
        بازگشت به خانه <ArrowLeft size={14} aria-hidden="true" />
      </Link>
    </main>
  );
}
