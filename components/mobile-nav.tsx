"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { IconButton } from "./ui/button";
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <IconButton
        label={open ? "بستن منو" : "بازکردن منو"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </IconButton>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="ناوبری موبایل"
          className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface-raised p-4 shadow-float"
        >
          <div className="mx-auto grid max-w-[1200px] gap-1">
            {[
              { href: "/#insurance-types", label: "انواع بیمه" },
              { href: "/#how-it-works", label: "روش کار" },
              { href: "/roadmap", label: "نقشه راه" },
              { href: "/evaluation", label: "ارزیابی" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-4 text-sm font-bold text-text hover:bg-surface-muted"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
