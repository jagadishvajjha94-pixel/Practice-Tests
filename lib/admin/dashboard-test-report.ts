import { classifyExamAttempt, type AdminExamType } from '@/lib/admin/exam-type';
import { reportFiltersForTestOverview } from '@/lib/admin/test-overview-report';
import type { AdminTestOverviewItem } from '@/lib/admin/tests-overview-data';

export function isDashboardOverviewTest(test: AdminTestOverviewItem): boolean {
  return test.id.startsWith('dashboard:');
}

export function reportFiltersForDashboardTest(input: {
  testId: string;
  testName: string;
  categorySlug?: string;
}): { examType: AdminExamType; testId: string; scheduleId: undefined } {
  const examType = classifyExamAttempt({
    test_id: input.testId,
    test_name: input.testName,
    category_slug: input.categorySlug ?? '',
  });
  return { examType, testId: input.testId, scheduleId: undefined };
}

export function resolveReportFiltersForOverview(test: AdminTestOverviewItem): {
  examType: AdminExamType;
  testId: string | undefined;
  scheduleId: string | undefined;
} {
  if (isDashboardOverviewTest(test)) {
    return reportFiltersForDashboardTest({
      testId: test.test_id ?? '',
      testName: test.title,
      categorySlug: test.topic ?? undefined,
    });
  }
  return reportFiltersForTestOverview(test);
}

/** Synthetic overview row for admin dashboard test-wise performance clicks. */
export function buildDashboardTestOverviewItem(row: {
  testId: string;
  testName: string;
  attempts: number;
  avgScore: number;
  categorySlug?: string;
}): AdminTestOverviewItem {
  return {
    id: `dashboard:${row.testId}`,
    test_id: row.testId,
    title: row.testName,
    kind: 'faculty_published',
    kind_label: 'Test',
    status: 'ended',
    status_label: 'Dashboard view',
    departments: [],
    years: [],
    starts_at: null,
    ends_at: null,
    notice: null,
    description: null,
    duration_minutes: null,
    topic: row.categorySlug ?? null,
    slot_number: null,
    faculty_department: null,
    students_attempted: row.attempts,
    completed_attempts: row.attempts,
    total_attempts: row.attempts,
    departments_attempted: [],
    avg_score: row.avgScore,
  };
}
