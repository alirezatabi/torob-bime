// Inventory changed Persian literal fragments for the redesign review. Requires git history.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const baseline = process.argv[2] || "eb2ca4a";
const roots = ["app", "components", "lib/schemas", "lib/domain", "lib/ai"];
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const paths = (text) => text.split("\n").filter((file) => /\.tsx?$/.test(file));
const beforeFiles = paths(git("ls-tree", "-r", "--name-only", baseline, "--", ...roots));
const afterFiles = paths(git("ls-files", "--", ...roots));

async function collect(files, read) {
  const found = new Map();
  for (const file of files) {
    const code = await read(file);
    const source = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    function visit(node) {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isJsxText(node)
      ) {
        const value = node.text.replace(/\s+/g, " ").trim();
        if (/[\u0600-\u06ff]/u.test(value) && !found.has(value)) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          found.set(value, `${file}:${line}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return found;
}
const before = await collect(beforeFiles, (file) => git("show", `${baseline}:${file}`));
const after = await collect(afterFiles, (file) => readFile(file, "utf8"));
const removed = [...before.keys()].filter((value) => !after.has(value));
const added = [...after.keys()].filter((value) => !before.has(value));
const rows = (values, source) =>
  values
    .sort((a, b) => a.localeCompare(b, "fa"))
    .map((value) => `- \`${source.get(value)}\` — ${JSON.stringify(value)}`)
    .join("\n");
console.log(
  `# Persian copy change inventory\n\nBaseline: \`${baseline}\` (pre-redesign). Scope: Persian-containing TypeScript/TSX string and JSX text fragments under \`app/\`, \`components/\`, \`lib/schemas/\`, \`lib/domain/\` and \`lib/ai/\`. Whitespace is collapsed and duplicate fragments are listed once. Paths are the first occurrence in each version. This inclusive inventory also contains some schema anchors and model prompts, not only visible UI copy. Template/interpolated strings may appear as separate fragments; dynamic data, model output and fixture policy text are not enumerable here.\n\n## Removed or replaced (${removed.length})\n\n${rows(removed, before)}\n\n## Added or replacement (${added.length})\n\n${rows(added, after)}\n`,
);
