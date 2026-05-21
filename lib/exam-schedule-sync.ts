import type { SupabaseClient } from '@supabase/supabase-js';
import { isScheduleWindowOpen, type ExamScheduleRow } from '@/lib/exam-schedule';

/**
 * Persist status=ended when a live row's ends_at has passed so the DB matches the time window.
 */
export async function syncExpiredLiveExamSchedules(
  admin: SupabaseClient,
  schedules: ExamScheduleRow[],
  now = Date.now(),
): Promise<ExamScheduleRow[]> {
  const expired = schedules.filter(
    (s) =>
      s.status === 'live' &&
      s.ends_at &&
      !isScheduleWindowOpen(s, now),
  );

  if (expired.length === 0) return schedules;

  const ids = expired.map((s) => s.id);
  const { error } = await admin
    .from('exam_schedules')
    .update({
      status: 'ended',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) {
    console.warn('[exam-schedules] syncExpiredLiveExamSchedules:', error.message);
    return schedules;
  }

  const endedIds = new Set(ids);
  return schedules.map((s) =>
    endedIds.has(s.id) ? { ...s, status: 'ended' as const } : s,
  );
}
