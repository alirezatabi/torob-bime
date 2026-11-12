import { z } from "zod";
import { NextResponse } from "next/server";
import { PayloadTooLargeError, readJsonLimited } from "@/lib/server/request";
import { getCatalogue } from "@/lib/data/catalog";
import { selectExplanationKeys } from "@/lib/ai/explanations";

const requestSchema = z
  .object({ slug: z.string().max(80), priorities: z.array(z.string().max(80)).max(12) })
  .strict();
export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await readJsonLimited(request));
    if (!parsed.success)
      return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
    const catalogue = await getCatalogue(parsed.data.slug);
    if (!catalogue) return NextResponse.json({ error: "نوع بیمه پیدا نشد." }, { status: 404 });
    const priorities = parsed.data.priorities.filter((key) =>
      catalogue.schema.fields.some(
        (field) => field.key === key && !field.isExclusion && field.kind !== "text",
      ),
    );
    const result = await selectExplanationKeys(catalogue.products, catalogue.schema, priorities);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PayloadTooLargeError)
      return NextResponse.json({ error: "درخواست بیش از حد طولانی است." }, { status: 413 });
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
    return NextResponse.json(
      { error: "توضیح آماده نشد؛ از مقادیر جدول استفاده کنید." },
      { status: 500 },
    );
  }
}
