import type { SupabaseClient } from '@supabase/supabase-js';
import { detectQuestionsIdKind, normalizeQuestionId } from '@/lib/exam-builder/id-utils';

function isUuidTypeMismatchError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('invalid input syntax for type uuid') || m.includes('uuid');
}

/** Link published questions to a test via test_questions (handles legacy BIGINT question ids). */
export async function linkTestQuestions(
  admin: SupabaseClient,
  testId: string,
  insertedRows: Array<{ id: unknown }>,
): Promise<void> {
  if (!insertedRows.length) return;

  const questionIdKind = await detectQuestionsIdKind(admin);
  const links = insertedRows.map((row, idx) => {
    const rawId = normalizeQuestionId(row.id);
    const question_id =
      questionIdKind === 'bigint' ? Number(rawId) : rawId;
    return {
      test_id: testId,
      question_id,
      order: idx + 1,
    };
  });

  const { error } = await admin.from('test_questions').upsert(links, {
    onConflict: 'test_id,question_id',
  });

  if (!error) return;

  if (isUuidTypeMismatchError(String(error.message ?? '')) && questionIdKind === 'bigint') {
    // Legacy: test_questions.question_id is UUID but questions.id is BIGINT.
    // Questions are already tied via questions.test_id from publish insert.
    return;
  }

  throw new Error(error.message);
}
