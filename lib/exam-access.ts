import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isScheduleWindowOpen,
  scheduleMatchesStudent,
  type ExamScheduleRow,
} from '@/lib/exam-schedule';
import { testIdsMatch } from '@/lib/test-attempts';
export type ExamAccessResult =
  | { allowed: true; schedule: ExamScheduleRow | null }
  | {
      allowed: false;
      code: 'NOT_LIVE' | 'TARGET_MISMATCH';
      message: string;
      schedule: ExamScheduleRow | null;
    };

async function schedulesForTest(
  admin: SupabaseClient,
  testId: string,
): Promise<ExamScheduleRow[]> {
  const { data, error } = await admin.from('exam_schedules').select('*');
  if (error) return [];
  return ((data ?? []) as ExamScheduleRow[]).filter((s) =>
    testIdsMatch(s.test_id, testId),
  );
}

/** Decide if a logged-in student may take this test (schedule window + targeting only). */
export async function checkStudentExamAccess(
  admin: SupabaseClient,
  input: {
    testId: string;
    department: string;
    year: string;
    now?: number;
  },
): Promise<ExamAccessResult> {
  const testId = input.testId.trim();
  const schedules = await schedulesForTest(admin, testId);

  if (schedules.length === 0) {
    return { allowed: true, schedule: null };
  }

  const now = input.now ?? Date.now();
  const liveSchedules = schedules.filter((s) => isScheduleWindowOpen(s, now));

  if (liveSchedules.length === 0) {
    const upcoming = schedules.some((s) => s.status === 'scheduled');
    return {
      allowed: false,
      code: 'NOT_LIVE',
      message: upcoming
        ? 'This examination is not live yet. Check your dashboard for the start time.'
        : 'This examination is not available right now.',
      schedule: schedules[0] ?? null,
    };
  }

  const schedule =
    liveSchedules.find((s) => scheduleMatchesStudent(s, input.department, input.year)) ??
    liveSchedules[0];

  if (!scheduleMatchesStudent(schedule, input.department, input.year)) {
    return {
      allowed: false,
      code: 'TARGET_MISMATCH',
      message:
        'This examination is not scheduled for your department or academic year.',
      schedule,
    };
  }

  return { allowed: true, schedule };
}

export async function assertStudentCanTakeTest(
  admin: SupabaseClient,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  },
  testId: string,
  profile: { branch: string | null; academic_year: string | null },
): Promise<ExamAccessResult> {
  return checkStudentExamAccess(admin, {
    testId,
    department: profile.branch ?? '',
    year: profile.academic_year ?? '',
  });
}
