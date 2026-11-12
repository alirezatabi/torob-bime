import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="border-b border-[#eceef1] bg-white">
      <div className="mx-auto flex h-[76px] max-w-[1200px] items-center gap-10 px-5 sm:px-8">
        <Logo />
        <nav
          aria-label="ناوبری اصلی"
          className="hidden items-center gap-8 text-[13px] font-medium text-[#63707d] md:flex"
        >
          <Link className="transition hover:text-brand" href="/#insurance-types">
            انواع بیمه
          </Link>
          <Link className="transition hover:text-brand" href="/#how-it-works">
            چطور کار می‌کند؟
          </Link>
          <Link className="transition hover:text-brand" href="/roadmap">
            نقشه راه
          </Link>
          <Link className="transition hover:text-brand" href="/evaluation">
            ارزیابی
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-2 rounded-full border border-[#f2d6d8] bg-[#fff8f8] px-3 py-2 text-[12px] font-semibold text-[#a34d55] sm:text-xs">
          <FlaskConical size={14} aria-hidden="true" />
          <span>نسخه آزمایشی</span>
        </div>
      </div>
    </header>
  );
}
