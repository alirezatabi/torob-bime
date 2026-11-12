import Link from "next/link";
import { ShieldCheck } from "lucide-react";
export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center gap-2.5"
      aria-label="ترب بیمه، صفحه اصلی"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-card">
        <ShieldCheck aria-hidden="true" size={25} strokeWidth={2} />
      </span>
      <span className="text-xl font-extrabold text-text">
        ترب <span className="text-brand-strong">بیمه</span>
      </span>
    </Link>
  );
}
