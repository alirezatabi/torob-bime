export default function Loading() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-24 text-center" aria-live="polite">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
      <p className="mt-4 text-sm text-text-muted">در حال آماده‌سازی اطلاعات...</p>
    </main>
  );
}
