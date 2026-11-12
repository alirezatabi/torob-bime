// Lightweight cross-platform guard; browser tests additionally inspect computed sizes.
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

async function files(dir) {
  const items = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      items.map((item) => {
        const path = join(dir, item.name);
        return item.isDirectory() ? files(path) : [path];
      }),
    )
  ).flat();
}
let failed = false;
for (const path of (await Promise.all([files("app"), files("components")])).flat()) {
  if (![".ts", ".tsx", ".js", ".jsx", ".css", ".svg"].includes(extname(path))) continue;
  const text = await readFile(path, "utf8");
  const issues = [];
  if (/#[\da-f]{3,8}\b/i.test(text)) issues.push("raw hex color");
  if (/\btracking-(?:tight|tighter|normal|wide|wider|widest|\[)/.test(text))
    issues.push("letter spacing");
  for (const match of text.matchAll(
    /(?:text-\[|font-size\s*:\s*|fontSize\s*:\s*["']?)(\d+(?:\.\d+)?)(px|rem)/gi,
  )) {
    const pixels = Number(match[1]) * (match[2].toLowerCase() === "rem" ? 16 : 1);
    if (pixels < 13) issues.push(`text below 13px (${match[0]})`);
  }
  if (issues.length) {
    failed = true;
    console.error(`${path}: ${[...new Set(issues)].join(", ")}`);
  }
}
if (failed) process.exitCode = 1;
else
  console.log(
    "Design check: no raw hex, letter-spacing or sub-13px fixed sizes in app/components.",
  );
