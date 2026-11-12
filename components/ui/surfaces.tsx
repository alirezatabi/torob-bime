import type { HTMLAttributes, ReactNode } from "react";
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-raised shadow-card ${className}`}
      {...props}
    />
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-surface-muted text-text-muted",
    brand: "bg-brand-soft text-brand-strong",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
export function Chip({
  children,
  active,
  onClick,
  label,
}: {
  children: ReactNode;
  active?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${active ? "border-brand bg-brand-soft text-brand-strong" : "border-border bg-surface-raised text-text-muted hover:border-brand hover:text-brand-strong"}`}
    >
      {children}
    </button>
  );
}
export function Disclosure({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-bold text-text-muted hover:text-brand-strong">
        {title}
      </summary>
      <div className="rounded-xl border border-border bg-surface-raised p-4 text-sm leading-7 text-text-muted shadow-card">
        {children}
      </div>
    </details>
  );
}
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="relative inline-block text-start">
      <summary
        aria-label={label}
        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-info hover:bg-info-soft"
      >
        ⓘ
      </summary>
      <span className="absolute end-0 top-full z-30 w-60 rounded-xl border border-border bg-surface-raised p-3 text-xs font-normal leading-6 text-text shadow-float">
        {children}
      </span>
    </details>
  );
}
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-xl bg-surface-muted ${className}`} />
  );
}
export function Toast({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-xs font-bold text-success">
      {children}
    </p>
  );
}
