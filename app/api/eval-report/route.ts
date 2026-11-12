import report from "@/fixtures/eval-report.json";
import { NextResponse } from "next/server";

/** The report is bundled at build time; no request-time dependency on cwd or fs. */
export function GET() {
  return new NextResponse(report, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
