import Link from "next/link";
import { ArrowLeft, ChevronLeft, Code2, FileCode2, GitBranchPlus, Layers3 } from "lucide-react";
import { TypeIcon } from "@/components/type-icon";
import { insuranceSchemas } from "@/lib/schemas/registry";

export default function RoadmapPage() {
  const roadmap = insuranceSchemas.filter((schema) => schema.status === "roadmap");
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
        <span className="text-[#63707d]">نقشه راه</span>
      </nav>
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fff2f3] px-3 py-1.5 text-[12px] font-bold text-brand">
          <GitBranchPlus size={14} aria-hidden="true" /> قدم‌های بعدی
        </span>
        <h1 className="mt-5 text-[28px] font-extrabold tracking-tight sm:text-[34px]">
          بیمه‌های بیشتر، مسیر روشن‌تر
        </h1>
        <p className="mt-3 text-sm leading-8 text-[#63707d]">
          فعلاً مقایسه برای سه نوع بیمه آماده است. دسته‌های زیر فقط در نقشه راه‌اند و هنوز اطلاعات یا
          طرح قابل مقایسه ندارند.
        </p>
      </div>
      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {roadmap.map((schema) => (
          <article
            key={schema.slug}
            className="rounded-[18px] border border-[#e9ecef] bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <TypeIcon type={schema.icon} />
              <span className="rounded-lg bg-[#f5f6f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#63707d]">
                در نقشه راه
              </span>
            </div>
            <h2 className="mt-4 text-sm font-extrabold">{schema.nameFa}</h2>
            <p className="mt-1.5 text-xs leading-6 text-[#63707d]">{schema.descriptionFa}</p>
            <div className="mt-5 flex items-center gap-2 border-t border-[#f2f3f4] pt-4 text-[11px] text-[#63707d]">
              <FileCode2 size={15} aria-hidden="true" />
              <code dir="ltr">lib/schemas/{schema.slug}.ts</code>
              <span>· بدون فیلد پوشش</span>
            </div>
          </article>
        ))}
      </div>
      <section className="mt-9 rounded-[20px] border border-[#eee9e9] bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fdf0f1] text-brand">
            <Layers3 size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-extrabold">اضافه‌کردن یک نوع بیمه چطور است؟</h2>
            <p className="mt-2 max-w-3xl text-xs leading-7 text-[#63707d]">
              ابتدا اسکیما، متن نمونه و موارد ارزیابی را بسازید؛ سپس پوشش‌ها و کلیدواژه‌ها را تعریف
              کنید. استخراج، جدول و امتیازدهی از همان اسکیما استفاده می‌کنند و به مسیر جداگانه برای
              هر بیمه نیاز ندارند.
            </p>
            <div className="mt-4 inline-flex max-w-full items-center gap-2 overflow-auto rounded-xl bg-[#f7f8f9] px-4 py-3 text-[12px] text-[#63707d]">
              <Code2 size={15} className="shrink-0" aria-hidden="true" />
              <code dir="ltr" className="whitespace-nowrap">
                npm run add-type -- new-type &quot;نام بیمه&quot;
              </code>
            </div>
            <p className="mt-3 text-[11px] leading-6 text-[#63707d]">
              خروجی اولیه خالی و غیرفعال است؛ تکمیل داده نمونه و ارزیابی پیش از فعال‌سازی لازم است.
            </p>
          </div>
        </div>
      </section>
      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-brand hover:text-brand-dark"
      >
        بازگشت به مقایسه <ArrowLeft size={14} aria-hidden="true" />
      </Link>
    </main>
  );
}
