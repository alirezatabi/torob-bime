"use client";

import { useLinkStatus } from "next/link";

/** A lightweight pending state for comparison links while their server data loads. */
export function LinkStatus() {
  const { pending } = useLinkStatus();
  return (
    <span role="status" className="block text-xs font-bold text-brand-strong empty:hidden">
      {pending ? "در حال آماده‌سازی مقایسه..." : ""}
    </span>
  );
}
