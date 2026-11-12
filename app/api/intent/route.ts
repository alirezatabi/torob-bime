import { z } from "zod";
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
  try {
    const input = requestSchema.safeParse(await readJsonLimited(request));
    if (!input.success)
      return NextResponse.json(
        { error: "لطفاً نیاز خود را در ۳ تا ۵۰۰ نویسه بنویسید." },
        { status: 400 },
      );
    if (containsSensitiveContact(input.data.text))
      return NextResponse.json({ error: "لطفاً شماره تلفن یا ایمیل وارد نکنید." }, { status: 400 });
    const intent = await understandIntent(input.data.text, input.data.chosenSlug);
    return NextResponse.json(intent, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PayloadTooLargeError)
      return NextResponse.json({ error: "درخواست بیش از حد طولانی است." }, { status: 413 });
    return NextResponse.json(
      { error: "در پردازش درخواست مشکلی پیش آمد؛ دوباره تلاش کنید." },
      { status: 400 },
    );
  }
}
