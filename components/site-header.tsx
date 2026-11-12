import Link from "next/link";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
export function SiteHeader() {
  return (
    <header className="relative z-30 border-b border-border bg-surface-raised">
      <div className="mx-auto flex h-[76px] max-w-[1200px] items-center gap-10 px-5 sm:px-8">
        <Logo />
        <nav
          aria-label="ناوبری اصلی"
          className="hidden items-center gap-7 text-xs font-bold text-text-muted md:flex"
        >
          <Link className="py-3 transition hover:text-brand-strong" href="/#insurance-types">
            انواع بیمه
          </Link>
          <Link className="py-3 transition hover:text-brand-strong" href="/#how-it-works">
            روش کار
          </Link>
          <Link className="py-3 transition hover:text-brand-strong" href="/roadmap">
            نقشه راه
          </Link>
          <Link className="py-3 transition hover:text-brand-strong" href="/evaluation">
            ارزیابی
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <span className="hidden rounded-full bg-brand-soft px-3 py-2 text-xs font-bold text-brand-strong sm:inline-flex">
            نسخه نمایشی
          </span>
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
