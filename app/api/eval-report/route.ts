import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
export async function GET() {
  try {
    const report = await readFile("EVAL_REPORT.md", "utf8");
    return new NextResponse(report, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "گزارش در دسترس نیست؛ ابتدا ارزیابی را اجرا کنید." },
      { status: 404 },
    );
  }
}
