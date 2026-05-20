import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isScheduleLiveNow,
  scheduleMatchesStudent,
  type ExamScheduleRow,
} from '@/lib/exam-schedule';
import { testIdsMatch } from '@/lib/test-attempts';
import { normalizeRollNumber, rollFromAuthUser } from '@/lib/exam-roster/normalize-roll';

export type RosterAccessResult =
  | { allowed: true; schedule: ExamScheduleRow | null; rosterEnforced: boolean }
  | {
      allowed: false;
      code: 'ROSTER_DENIED' | 'NOT_LIVE' | 'TARGET_MISMATCH';
      message: string;
      schedule: ExamScheduleRow | null;
    };

function isMissingRosterTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const msg = String(e.message ?? '').toLowerCase();
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    msg.includes('exam_student_roster') ||
    msg.includes('schema cache')
  );
}

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

async function rosterCountForSchedule(
  admin: SupabaseClient,
  scheduleId: string,
): Promise<number> {
  const { count, error } = await admin
    .from('exam_student_roster')
    .select('id', { count: 'exact', head: true })
    .eq('exam_schedule_id', scheduleId);

  if (error) {
    if (isMissingRosterTable(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

async function isRollOnRoster(
  admin: SupabaseClient,
  scheduleId: string,
  roll: string,
): Promise<boolean> {
  const normalized = normalizeRollNumber(roll);
  if (!normalized) return false;

  const { data, error } = await admin
    .from('exam_student_roster')
    .select('id')
    .eq('exam_schedule_id', scheduleId)
    .eq('roll_number', normalized)
    .maybeSingle();

  if (error) {
    if (isMissingRosterTable(error)) return true;
    throw error;
  }
  return Boolean(data?.id);
}

/**
 * Decide if a logged-in student may take this test.
 * When a live schedule has roster rows, only listed roll numbers may proceed.
 */
export async function checkStudentExamAccess(
  admin: SupabaseClient,
  input: {
    testId: string;
    rollNumber: string;
    department: string;
    year: string;
    now?: number;
  },
): Promise<RosterAccessResult> {
  const testId = input.testId.trim();
  const schedules = await schedulesForTest(admin, testId);

  if (schedules.length === 0) {
    return { allowed: true, schedule: null, rosterEnforced: false };
  }

  const now = input.now ?? Date.now();
  const liveSchedules = schedules.filter((s) => isScheduleLiveNow(s, now));

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

  const rosterSize = await rosterCountForSchedule(admin, schedule.id);
  if (rosterSize === 0) {
    return { allowed: true, schedule, rosterEnforced: false };
  }

  const onRoster = await isRollOnRoster(admin, schedule.id, input.rollNumber);
  if (!onRoster) {
    return {
      allowed: false,
      code: 'ROSTER_DENIED',
      message:
        'You are not on the approved student list for this examination. If you believe this is an error, contact the examination cell with your roll number.',
      schedule,
    };
  }

  return { allowed: true, schedule, rosterEnforced: true };
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
): Promise<RosterAccessResult> {
  return checkStudentExamAccess(admin, {
    testId,
    rollNumber: rollFromAuthUser(user),
    department: profile.branch ?? '',
    year: profile.academic_year ?? '',
  });
}

export async function getRosterCountsBySchedule(
  admin: SupabaseClient,
  scheduleIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!scheduleIds.length) return map;

  const { data, error } = await admin
    .from('exam_student_roster')
    .select('exam_schedule_id')
    .in('exam_schedule_id', scheduleIds);

  if (error) {
    if (isMissingRosterTable(error)) return map;
    throw error;
  }

  for (const row of data ?? []) {
    const id = String(row.exam_schedule_id);
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}
