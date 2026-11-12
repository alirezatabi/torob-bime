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

/** Iranian national code checksum (common repeated-digit placeholders are invalid). */
export function isIranianNationalId(value: string): boolean {
  if (!/^\d{10}$/.test(value) || /^(\d)\1{9}$/.test(value)) return false;
  const sum = [...value.slice(0, 9)].reduce(
    (total, digit, index) => total + Number(digit) * (10 - index),
    0,
  );
  const remainder = sum % 11;
  return Number(value[9]) === (remainder < 2 ? remainder : 11 - remainder);
}

export function isLuhnCard(value: string): boolean {
  if (!/^\d{16}$/.test(value) || /^(\d)\1{15}$/.test(value)) return false;
  const sum = [...value].reverse().reduce((total, digit, index) => {
    let n = Number(digit);
    if (index % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    return total + n;
  }, 0);
  return sum % 10 === 0;
}

/** Privacy guard, not a complete detector of personal, medical or financial data. */
export function containsSensitiveContact(value: string): boolean {
  const normalized = toLatinDigits(value);
  const compact = normalized.replace(/[\s()-]/g, "");
  if (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalized) ||
    /(?:\+?98|0)9\d{9}/.test(compact)
  )
    return true;
  if (/(?<![A-Z0-9])IR[ -]?(?:\d[ -]?){23}\d(?!\d)/i.test(normalized)) return true;
  const candidates = [...normalized.matchAll(/(?<!\d)(?:\d[ -]?){9}\d(?!\d)/g)];
  if (candidates.some((match) => isIranianNationalId(match[0].replace(/[ -]/g, "")))) return true;
  const cards = [...normalized.matchAll(/(?<!\d)(?:\d[ -]?){15}\d(?!\d)/g)];
  return cards.some((match) => isLuhnCard(match[0].replace(/[ -]/g, "")));
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
