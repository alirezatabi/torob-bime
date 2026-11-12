import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const slug = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
  .max(60)
  .parse(process.argv[2]);
const name = z.string().trim().min(1).max(80).parse(process.argv[3]);
const variable = `${slug.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())}Schema`;
const schemaPath = join("lib", "schemas", `${slug}.ts`);
const stubs = join("fixtures", "scaffolds");
const productPath = join(stubs, `${slug}.product.json`);
const evalPath = join(stubs, `${slug}.eval.json`);
if ([schemaPath, productPath, evalPath].some(existsSync))
  throw new Error(`A scaffold for ${slug} already exists; nothing was changed.`);
const registryPath = join("lib", "schemas", "registry.ts");
let registry = readFileSync(registryPath, "utf8");
if (!registry.includes("// scaffold:imports") || !registry.includes("// scaffold:items"))
  throw new Error("Registry markers are missing; nothing was changed.");
registry = registry
  .replace("// scaffold:imports", `import { ${variable} } from "./${slug}";\n// scaffold:imports`)
  .replace("  // scaffold:items", `  ${variable},\n  // scaffold:items`);
mkdirSync(stubs, { recursive: true });
writeFileSync(
  schemaPath,
  `import { insuranceSchemaSchema } from "./contracts";\n\n// Roadmap only: define coverage fields before activating.\nexport const ${variable} = insuranceSchemaSchema.parse({\n  slug: ${JSON.stringify(slug)},\n  nameFa: ${JSON.stringify(name)},\n  shortNameFa: ${JSON.stringify(name)},\n  descriptionFa: "به‌زودی به مقایسه اضافه می‌شود",\n  icon: "shield",\n  status: "roadmap",\n  intentKeywords: [],\n  fields: [],\n});\n`,
);
writeFileSync(
  productPath,
  JSON.stringify(
    {
      slug: `${slug}-sample`,
      typeSlug: slug,
      insurerSlug: "sample",
      insurerNameFa: "شرکت نمونه (فرضی)",
      nameFa: "طرح نمونه",
      sourceText: "",
      sourceUrl: null,
      isSampleData: true,
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  evalPath,
  JSON.stringify({ id: `${slug}-example`, typeSlug: slug, sourceText: "", expected: {} }, null, 2) +
    "\n",
);
writeFileSync(registryPath, registry);
console.log(
  `Created roadmap schema ${schemaPath}, sample and eval stubs; registered ${slug}. Fill and validate the stubs before activation.`,
);
