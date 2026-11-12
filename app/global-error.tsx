"use client";
import { useEffect } from "react";
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const digest =
      error.digest && /^[a-zA-Z0-9_-]{1,80}$/.test(error.digest) ? error.digest : "unavailable";
    console.error(`Root failed (digest: ${digest})`);
  }, [error]);
  return (
    <html lang="fa" dir="rtl">
      <body>
        <main>
          <h1>مشکلی پیش آمد</h1>
          <p>لطفاً دوباره تلاش کنید.</p>
          <button onClick={reset}>تلاش دوباره</button>
        </main>
      </body>
    </html>
  );
}
