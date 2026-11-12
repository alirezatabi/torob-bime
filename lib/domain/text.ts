const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const fa = persianDigits.indexOf(digit);
    return String(fa >= 0 ? fa : arabicDigits.indexOf(digit));
  });
}

export function normalizePersian(value: string): string {
  return toLatinDigits(value)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‍]/g, " ")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sanitizeInput(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Basic contact-data guard, not a comprehensive personal-data detector. */
export function containsSensitiveContact(value: string): boolean {
  const normalized = toLatinDigits(value);
  const compact = normalized.replace(/[\s()-]/g, "");
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalized) || /(?:\+?98|0)9\d{9}/.test(compact)
  );
}

/** Parses a number from a quoted policy line, including Persian digits and magnitudes. */
export function parsePersianNumber(value: string): number | null {
  const normalized = toLatinDigits(value).replace(/[٬,]/g, "").replace(/٫/g, ".");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  let number = Number(match[0]);
  const suffix = normalized.slice((match.index ?? 0) + match[0].length).trim();
  if (/^میلیارد/.test(suffix)) number *= 1_000_000_000;
  else if (/^میلیون/.test(suffix)) number *= 1_000_000;
  else if (/^هزار/.test(suffix)) number *= 1_000;
  return Number.isFinite(number) ? number : null;
}
