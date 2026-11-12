import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-xl font-bold">این صفحه پیدا نشد</h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        شاید این نوع بیمه هنوز در نسخه نمایشی آماده نباشد.
      </p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-xl bg-brand px-5 py-3 text-sm font-bold text-on-brand"
      >
        بازگشت به خانه
      </Link>
    </main>
  );
}
