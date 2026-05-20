/** Normalize academic year labels for matching (I Year vs 1 vs First). */
export function normalizeAcademicYearKey(value: string | null | undefined): string {
  if (!value) return '';
  const v = value.trim().toLowerCase();
  if (/^i\b|^1\b|first/.test(v)) return '1';
  if (/^ii\b|^2\b|second/.test(v)) return '2';
  if (/^iii\b|^3\b|third/.test(v)) return '3';
  if (/^iv\b|^4\b|fourth/.test(v)) return '4';
  return v.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function academicYearsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeAcademicYearKey(a);
  const nb = normalizeAcademicYearKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return a?.trim() === b?.trim();
}

export function academicYearInList(year: string, allowed: string[]): boolean {
  if (!allowed.length) return true;
  return allowed.some((y) => academicYearsMatch(year, y));
}
