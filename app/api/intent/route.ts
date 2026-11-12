import { z } from "zod";
import { guardJsonPost } from "@/lib/server/route-guard";
import { logFailure } from "@/lib/server/log";
import { NextResponse } from "next/server";
import { PayloadTooLargeError, readJsonLimited } from "@/lib/server/request";
import { understandIntent } from "@/lib/ai/intent";
import { containsSensitiveContact, sanitizeInput } from "@/lib/domain/text";
import { activeSchemas } from "@/lib/schemas/registry";

const requestSchema = z
  .object({
    text: z.string().max(500).transform(sanitizeInput).pipe(z.string().min(3).max(500)),
    chosenSlug: z
      .string()
      .optional()
      .refine((value) => !value || activeSchemas.some((schema) => schema.slug === value)),
  })
  .strict();

export async function POST(request: Request) {
  const rejected = guardJsonPost(request, "intent");
  if (rejected) return rejected;
  try {
    const input = requestSchema.safeParse(await readJsonLimited(request));
    if (!input.success)
      return NextResponse.json(
        { error: "لطفاً نیاز خود را در ۳ تا ۵۰۰ نویسه بنویسید." },
        { status: 400 },
      );
    if (containsSensitiveContact(input.data.text))
      return NextResponse.json(
        { error: "لطفاً شماره تماس، ایمیل، کد ملی، شماره کارت یا شبا وارد نکنید." },
        { status: 400 },
      );
    const intent = await understandIntent(input.data.text, input.data.chosenSlug);
    return NextResponse.json(intent, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PayloadTooLargeError)
      return NextResponse.json({ error: "درخواست بیش از حد طولانی است." }, { status: 413 });
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
    logFailure("route", error);
    return NextResponse.json(
      { error: "در پردازش درخواست مشکلی پیش آمد؛ دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
