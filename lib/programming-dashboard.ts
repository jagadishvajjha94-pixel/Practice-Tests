/** Stable id for programming attempts (not a DB tests row). */
export const PROGRAMMING_DASHBOARD_TEST_ID = 'programming-assessment-v1';

export const PROGRAMMING_DASHBOARD_TEST_NAME = 'Programming Assessment';

export function isDepartmentExamTest(test: {
  name?: string | null;
  description?: string | null;
  category_id?: string | null;
}): boolean {
  const desc = String(test.description ?? '');
  const name = String(test.name ?? '');
  if (/department/i.test(desc)) return true;
  if (desc.includes('Department:')) return true;
  if (/department exam/i.test(name)) return true;
  if (test.category_id === 'department-exams') return true;
  return false;
}

export function dashboardDisplayNameForTest(test: {
  name: string;
  description?: string | null;
  category_id?: string | null;
}): string {
  if (isDepartmentExamTest(test)) {
    return `Department · ${test.name}`;
  }
  return test.name;
}
