import { NextResponse } from "next/server";
import { routeLimiter, type RateLimitStore } from "./rate-limit";

/** Browser same-origin guard; direct clients without Origin are allowed but rate-limited. */
export function guardJsonPost(
  request: Request,
  namespace: string,
  limiter: RateLimitStore = routeLimiter,
): Response | null {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json")
    return NextResponse.json({ error: "فرمت درخواست باید JSON باشد." }, { status: 415 });
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site")
    return NextResponse.json({ error: "مبدأ درخواست مجاز نیست." }, { status: 403 });
  if (origin) {
    try {
      const url = new URL(origin);
      const requestUrl = new URL(request.url);
      const host = request.headers.get("host") ?? requestUrl.host;
      const expected = new URL(`${requestUrl.protocol}//${host}`);
      if (
        !/^https?:$/.test(url.protocol) ||
        url.origin !== expected.origin ||
        url.pathname !== "/" ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      )
        return NextResponse.json({ error: "مبدأ درخواست مجاز نیست." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "مبدأ درخواست مجاز نیست." }, { status: 403 });
    }
  }
  // Forwarded headers are attacker controlled unless a trusted reverse proxy sanitizes them.
  const forwarded =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
      : null;
  const client = forwarded && /^[a-fA-F0-9:.]{2,64}$/.test(forwarded) ? forwarded : "shared";
  const result = limiter.take(`${namespace}:${client}`);
  if (!result.allowed)
    return NextResponse.json(
      { error: "درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" },
      },
    );
  return null;
}
