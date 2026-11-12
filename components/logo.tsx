import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center gap-2.5"
      aria-label="ترب بیمه، صفحه اصلی"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-brand text-white shadow-sm">
        <ShieldCheck aria-hidden="true" size={23} strokeWidth={2.2} />
      </span>
      <span className="flex flex-col leading-[1.1]">
        <span className="text-[20px] font-extrabold tracking-tight text-[#262d37]">
          ترب <span className="text-brand">بیمه</span>
        </span>
        <span className="mt-1 text-[10px] font-medium tracking-[.02em] text-[#63707d]">
          مقایسه، با چشم باز
        </span>
      </span>
    </Link>
  );
}
