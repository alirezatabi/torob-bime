import type {
  ComparableProduct,
  CoverageConstraint,
  InsuranceSchema,
} from "@/lib/schemas/contracts";
import { isScoredField } from "./ranking";
export type ComparisonState = {
  priorities: string[];
  constraints: CoverageConstraint[];
  selected: string[];
  budget: number | null;
};
type Search = Pick<URLSearchParams, "get">;
/** Use the same bounded validation on the server and for every client-side history update. */
export function readComparisonState(
  search: Search,
  schema: InsuranceSchema,
  products: ComparableProduct[],
): ComparisonState {
  const list = (key: string) => [
    ...new Set((search.get(key) ?? "").slice(0, 2000).split(",").filter(Boolean)),
  ];
  const priorities = list("priorities")
    .filter((key) => schema.fields.some((field) => field.key === key && isScoredField(field)))
    .slice(0, 12);
  const constraints: CoverageConstraint[] = list("required")
    .filter((key) =>
      schema.fields.some(
        (field) =>
          field.key === key &&
          isScoredField(field) &&
          field.kind === "boolean" &&
          field.higherIsBetter,
      ),
    )
    .slice(0, 12)
    .map((fieldKey) => ({ fieldKey, kind: "covered" }));
  const available = new Set(products.map((product) => product.slug));
  const requested = list("compare")
    .filter((key) => available.has(key))
    .slice(0, 6);
  const selected =
    requested.length >= 2 ? requested : products.slice(0, 6).map((product) => product.slug);
  const rawBudget = search.get("budget")?.trim() ?? "";
  const value = /^\d{1,13}$/.test(rawBudget) ? Number(rawBudget) : NaN;
  const budget =
    Number.isSafeInteger(value) && value > 0 && value <= 1_000_000_000_000 ? value : null;
  return { priorities, constraints, selected, budget };
}
