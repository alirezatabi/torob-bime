import { z } from "zod";
import { createHash } from "node:crypto";
import { guardJsonPost } from "@/lib/server/route-guard";
import { cachedExplanation } from "@/lib/server/explanation-cache";
import { logFailure } from "@/lib/server/log";
import { NextResponse } from "next/server";
import { PayloadTooLargeError, readJsonLimited } from "@/lib/server/request";
import { getCatalogue } from "@/lib/data/catalog";
import { selectExplanationKeys } from "@/lib/ai/explanations";

const requestSchema = z
  .object({ slug: z.string().max(80), priorities: z.array(z.string().max(80)).max(12) })
  .strict();
export async function POST(request: Request) {
  const rejected = guardJsonPost(request, "explain");
  if (rejected) return rejected;
  try {
    const parsed = requestSchema.safeParse(await readJsonLimited(request));
    if (!parsed.success)
      return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
    const catalogue = await getCatalogue(parsed.data.slug);
    if (!catalogue) return NextResponse.json({ error: "نوع بیمه پیدا نشد." }, { status: 404 });
    const priorities = [...new Set(parsed.data.priorities)].filter((key) =>
      catalogue.schema.fields.some(
        (field) => field.key === key && !field.isExclusion && field.kind !== "text",
      ),
    );
    priorities.sort();
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          parsed.data.slug,
          priorities,
          catalogue.version,
          process.env.LLM_MODEL ?? "",
          process.env.LLM_MODEL_FAST ?? "",
          Boolean(process.env.ANTHROPIC_API_KEY),
        ]),
      )
      .digest("hex");
    const result = await cachedExplanation(key, () =>
      selectExplanationKeys(catalogue.products, catalogue.schema, priorities),
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PayloadTooLargeError)
      return NextResponse.json({ error: "درخواست بیش از حد طولانی است." }, { status: 413 });
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
    logFailure("route", error);
    return NextResponse.json(
      { error: "توضیح آماده نشد؛ از مقادیر جدول استفاده کنید." },
      { status: 500 },
    );
  }
}
