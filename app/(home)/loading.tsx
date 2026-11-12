import { Skeleton } from "@/components/ui/surfaces";

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8" aria-live="polite">
      <p className="sr-only">در حال آماده‌سازی اطلاعات...</p>
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-6 h-20 w-4/5" />
          <Skeleton className="mt-5 h-12 w-full" />
          <Skeleton className="mt-8 h-36 w-full" />
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
      <Skeleton className="mt-20 h-8 w-56" />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-40 w-full" />
        ))}
      </div>
    </main>
  );
}
