import type { SupabaseClient } from '@supabase/supabase-js';
import { parseQuestionsJson, type FacultyExamQuestion } from '@/lib/faculty-exams';

const DEPT_EXAMS_SLUG = 'department-exams';

async function ensureDepartmentExamsCategory(admin: SupabaseClient): Promise<string> {
  const { data: existing } = await admin
    .from('test_categories')
    .select('id')
    .eq('slug', DEPT_EXAMS_SLUG)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await admin
    .from('test_categories')
    .insert({
      name: 'Department Exams',
      slug: DEPT_EXAMS_SLUG,
      description: 'Faculty-submitted exams approved by the examination cell',
      icon: '🏫',
    })
    .select('id')
    .single();

  if (error || !created?.id) {
    throw new Error(error?.message ?? 'Could not create department exams category');
  }
  return created.id as string;
}

export async function publishFacultyExamRequest(
  admin: SupabaseClient,
  requestId: string,
  adminUserId: string,
): Promise<{ testId: string }> {
  const { data: request, error: fetchError } = await admin
    .from('faculty_exam_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error('Exam request not found');
  if (request.status === 'approved' && request.published_test_id) {
    return { testId: request.published_test_id as string };
  }
  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be approved');
  }

  const questions = parseQuestionsJson(request.questions_json) as FacultyExamQuestion[];
  if (questions.length === 0) {
    throw new Error('Exam has no questions');
  }

  const categoryId = await ensureDepartmentExamsCategory(admin);

  const { data: testRow, error: testError } = await admin
    .from('tests')
    .insert({
      category_id: categoryId,
      title: request.title,
      description: request.description ?? `Department: ${request.department}`,
      duration_minutes: request.duration_minutes,
      total_questions: questions.length,
      difficulty: 'medium',
    })
    .select('id')
    .single();

  if (testError || !testRow?.id) {
    throw new Error(testError?.message ?? 'Failed to create test');
  }

  const testId = testRow.id as string;

  const questionRows = questions.map((q) => ({
    test_id: testId,
    question_text: q.question_text,
    question_type: 'mcq',
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? '',
    marks: 1,
  }));

  const { data: inserted, error: qError } = await admin
    .from('questions')
    .insert(questionRows)
    .select('id');

  if (qError) throw new Error(qError.message);

  if (inserted?.length) {
    const links = inserted.map((row, idx) => ({
      test_id: testId,
      question_id: row.id,
      order: idx + 1,
    }));
    await admin.from('test_questions').upsert(links, { onConflict: 'test_id,question_id' });
  }

  const { error: updateError } = await admin
    .from('faculty_exam_requests')
    .update({
      status: 'approved',
      published_test_id: testId,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) throw new Error(updateError.message);

  return { testId };
}
