import type { SupabaseClient } from '@supabase/supabase-js';
import { isElevateXTestId } from '@/lib/elevatex';

export type DeleteFacultyExamResult = {
  requestId: string;
  title: string | null;
  deletedScheduleIds: string[];
  deletedTestId: string | null;
  deletedAttemptIds: string[];
  errors: string[];
};

function protectTestId(testId: string | null | undefined): boolean {
  const id = String(testId ?? '').trim();
  if (!id) return true;
  return isElevateXTestId(id);
}

async function deleteByIds(
  supabase: SupabaseClient,
  table: string,
  column: string,
  ids: string[],
): Promise<string | null> {
  if (ids.length === 0) return null;
  const { error } = await supabase.from(table).delete().in(column, ids);
  return error?.message ?? null;
}

/** Remove one faculty exam request and related schedules, test, attempts, questions. */
export async function deleteFacultyExamRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<DeleteFacultyExamResult | { error: string }> {
  const { data: request, error: fetchErr } = await supabase
    .from('faculty_exam_requests')
    .select('id, title, published_test_id')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!request) return { error: 'Exam not found' };

  const result: DeleteFacultyExamResult = {
    requestId,
    title: (request.title as string | null) ?? null,
    deletedScheduleIds: [],
    deletedTestId: null,
    deletedAttemptIds: [],
    errors: [],
  };

  const { data: schedules } = await supabase
    .from('exam_schedules')
    .select('id')
    .eq('faculty_exam_request_id', requestId);

  const scheduleIds = (schedules ?? []).map((s) => String(s.id));
  result.deletedScheduleIds = scheduleIds;

  if (scheduleIds.length) {
    const rosterErr = await deleteByIds(
      supabase,
      'exam_student_roster',
      'exam_schedule_id',
      scheduleIds,
    );
    if (rosterErr) result.errors.push(`exam_student_roster: ${rosterErr}`);

    const schedErr = await deleteByIds(supabase, 'exam_schedules', 'id', scheduleIds);
    if (schedErr) result.errors.push(`exam_schedules: ${schedErr}`);
  }

  const slotErr = await deleteByIds(
    supabase,
    'exam_slot_roster_entries',
    'faculty_exam_request_id',
    [requestId],
  );
  if (slotErr) result.errors.push(`exam_slot_roster_entries: ${slotErr}`);

  const drawErr = await deleteByIds(
    supabase,
    'exam_builder_draws',
    'faculty_exam_request_id',
    [requestId],
  );
  if (drawErr) result.errors.push(`exam_builder_draws: ${drawErr}`);

  const publishedTestId = request.published_test_id
    ? String(request.published_test_id)
    : null;

  if (publishedTestId && !protectTestId(publishedTestId)) {
    result.deletedTestId = publishedTestId;

    const { data: attempts } = await supabase
      .from('test_attempts')
      .select('id')
      .eq('test_id', publishedTestId);

    const attemptIds = (attempts ?? []).map((a) => String(a.id));
    result.deletedAttemptIds = attemptIds;

    if (attemptIds.length) {
      await deleteByIds(supabase, 'exam_violations', 'attempt_id', attemptIds);
      const attemptErr = await deleteByIds(supabase, 'test_attempts', 'id', attemptIds);
      if (attemptErr) result.errors.push(`test_attempts: ${attemptErr}`);
    }

    await deleteByIds(supabase, 'exam_builder_draws', 'test_id', [publishedTestId]);
    await deleteByIds(supabase, 'test_questions', 'test_id', [publishedTestId]);
    const qErr = await deleteByIds(supabase, 'questions', 'test_id', [publishedTestId]);
    if (qErr) result.errors.push(`questions: ${qErr}`);
    const testErr = await deleteByIds(supabase, 'tests', 'id', [publishedTestId]);
    if (testErr) result.errors.push(`tests: ${testErr}`);
  }

  const reqErr = await deleteByIds(supabase, 'faculty_exam_requests', 'id', [requestId]);
  if (reqErr) result.errors.push(`faculty_exam_requests: ${reqErr}`);

  if (reqErr) return { error: reqErr };

  return result;
}

/** Delete a single exam schedule window (roster + row). Keeps faculty request and published test. */
export async function deleteExamScheduleById(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<{ ok: true } | { error: string }> {
  const { data, error: fetchErr } = await supabase
    .from('exam_schedules')
    .select('id')
    .eq('id', scheduleId)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!data) return { error: 'Schedule not found' };

  await deleteByIds(supabase, 'exam_student_roster', 'exam_schedule_id', [scheduleId]);
  const { error } = await supabase.from('exam_schedules').delete().eq('id', scheduleId);
  if (error) return { error: error.message };
  return { ok: true };
}
