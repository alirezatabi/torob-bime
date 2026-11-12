"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-xl font-bold">مشکلی پیش آمد</h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        اطلاعات در حال حاضر آماده نیست. لطفاً دوباره تلاش کنید.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white"
      >
        تلاش دوباره
      </button>
    </main>
  );
}
