import { faNumber } from "@/lib/domain/format";
export function InsurerMark({ slug, name }: { slug: string; name: string }) {
  const tones = [
    "bg-info-soft text-info",
    "bg-brand-soft text-brand-strong",
    "bg-success-soft text-success",
    "bg-warning-soft text-warning",
  ];
  const index = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tones.length;
  const initial = name.replace(/^بیمه\s*/, "").charAt(0);
  return (
    <span
      role="img"
      aria-label={`نشان نمونه ${name}`}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${tones[index]}`}
    >
      {initial}
    </span>
  );
}
export function ScoreRing({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-border"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${safe} 100`}
            pathLength="100"
            className="text-brand"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-text">
          {faNumber(safe)}٪
        </span>
      </div>
      <p className="text-xs font-bold leading-6 text-text">
        {faNumber(safe)}٪ هم‌خوان با نیاز شما{" "}
        <span className="block font-normal text-text-muted">امتیاز نسبی پوشش</span>
      </p>
    </div>
  );
}
