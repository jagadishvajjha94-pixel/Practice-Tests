/** Normalize department labels for fuzzy comparison (case, punctuation, & vs and). */
export function normalizeDepartmentKey(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function departmentsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeDepartmentKey(a);
  const nb = normalizeDepartmentKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

export function examMatchesDepartment(
  exam: { department?: string | null; target_branches?: string[] | null },
  department: string,
): boolean {
  if (departmentsMatch(exam.department, department)) return true;
  const branches = (exam.target_branches as string[] | null) ?? [];
  return branches.some((b) => departmentsMatch(b, department));
}
