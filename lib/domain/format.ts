import type { CoverageField, CoveragePrimitive } from "@/lib/schemas/contracts";

const formatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
export function faNumber(value: number): string {
  return formatter.format(value);
}
export function formatMoney(value: number): string {
  if (value >= 1_000_000_000 && value % 1_000_000 === 0) {
    return `${faNumber(value / 1_000_000_000)} میلیارد تومان`;
  }
  if (value >= 1_000_000 && value % 100_000 === 0) {
    return `${faNumber(value / 1_000_000)} میلیون تومان`;
  }
  return `${faNumber(value)} تومان`;
}
export function formatValue(field: CoverageField, value: CoveragePrimitive): string {
  if (value === null) return "نامشخص";
  if (typeof value === "boolean") return value ? "دارد" : "ندارد";
  if (typeof value === "string") {
    return field.options?.find((option) => option.value === value)?.labelFa ?? value;
  }
  switch (field.unit) {
    case "toman":
      return formatMoney(value);
    case "euro":
      return `${faNumber(value)} یورو`;
    case "percent":
      return `${faNumber(value)}٪`;
    case "month":
      return `${faNumber(value)} ماه`;
    case "day":
      return `${faNumber(value)} روز`;
    default:
      return faNumber(value);
  }
}
