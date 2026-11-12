import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { Logo } from "./logo";
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface-raised">
      <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-10 sm:px-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-lg">
            <Logo />
            <p className="mt-4 text-sm leading-7 text-text-muted">
              ترب بیمه یک پروژه نمایشی مستقل برای مقایسه آگاهانه‌تر است؛ فروشنده یا مشاور رسمی بیمه
              نیست.
            </p>
          </div>
          <nav
            aria-label="پیوندهای پایین صفحه"
            className="flex flex-wrap items-start gap-x-6 gap-y-2 text-xs font-bold text-text-muted"
          >
            <Link href="/#insurance-types" className="py-2 hover:text-brand-strong">
              انواع بیمه
            </Link>
            <Link href="/roadmap" className="py-2 hover:text-brand-strong">
              نقشه راه
            </Link>
            <Link href="/evaluation" className="py-2 hover:text-brand-strong">
              ارزیابی
            </Link>
            <a
              href="https://github.com/alirezatabi/torob-bime"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 py-2 hover:text-brand-strong"
            >
              مخزن پروژه <ArrowUpLeft size={15} aria-hidden="true" />
            </a>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-5 text-xs leading-7 text-text-muted">
          <p>ساخته‌شده توسط علیرضا طبیب‌زاده برای چالش مهندس محصول هوش مصنوعی ترب</p>
          <p>
            طرح‌های دارای برچسب «نمونه»، شرکت‌ها و حق‌بیمه‌هایشان ساختگی‌اند؛ مبنای خرید یا قیمت
            واقعی نیستند.
          </p>
        </div>
      </div>
    </footer>
  );
}
