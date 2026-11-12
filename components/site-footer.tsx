import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[#eceef1] bg-white">
      <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-10 sm:px-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div className="max-w-md">
            <Logo />
            <p className="mt-4 text-xs leading-7 text-[#63707d]">
              ترب بیمه یک نمونه نمایشی برای مقایسه آگاهانه‌تر بیمه است؛ نه فروشنده است و نه مشاور
              رسمی بیمه.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-[#68727f]">
            <Link href="/#insurance-types" className="hover:text-brand">
              انواع بیمه
            </Link>
            <Link href="/roadmap" className="hover:text-brand">
              نقشه راه
            </Link>
            <Link href="/evaluation" className="hover:text-brand">
              ارزیابی سیستم
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-[#f0f1f3] pt-5 text-[12px] leading-6 text-[#63707d]">
          تمام نام‌ها و اطلاعات نمونه ساختگی‌اند و مبنای خرید یا قیمت واقعی نیستند.
        </div>
      </div>
    </footer>
  );
}
