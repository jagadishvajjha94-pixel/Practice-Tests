import { isElevateXModule } from '@/lib/elevatex';
import type { AdminExamType } from '@/lib/admin/exam-type';
import type { AdminTestOverviewItem } from '@/lib/admin/tests-overview-data';

/** Map an admin Tests overview row to the report tab + test filter for PDF/CSV export. */
export function reportFiltersForTestOverview(test: AdminTestOverviewItem): {
  examType: AdminExamType;
  testId: string | undefined;
} {
  if (test.kind === 'evalora_module') {
    if (isElevateXModule(test.test_id ?? '')) {
      return { examType: 'elevatex', testId: test.test_id ?? 'placement_full' };
    }
    if (/\brmset\b/i.test(test.title) || /\brmset\b/i.test(test.test_id ?? '')) {
      return { examType: 'rmset', testId: test.test_id ?? undefined };
    }
    return { examType: 'all', testId: test.test_id ?? undefined };
  }

  if (test.kind === 'faculty_schedule' || test.kind === 'faculty_published') {
    return { examType: 'department', testId: test.test_id ?? undefined };
  }

  return { examType: 'all', testId: test.test_id ?? undefined };
}

export function scheduleLabelForTestOverview(test: AdminTestOverviewItem): string | undefined {
  if (!test.starts_at) return undefined;
  const start = new Date(test.starts_at).toLocaleString();
  if (!test.ends_at) return start;
  return `${start} → ${new Date(test.ends_at).toLocaleString()}`;
}
