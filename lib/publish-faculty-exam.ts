import type { SupabaseClient } from '@supabase/supabase-js';
import { linkTestQuestions } from '@/lib/exam-builder/link-test-questions';
import {
  detectQuestionsIdKind,
  detectTestsIdKind,
  isUuidTypeMismatchError,
  normalizeTestId,
} from '@/lib/exam-builder/id-utils';
import { isFacultyCodingQuestion } from '@/lib/exam-builder/programming-syllabus';
import { parseQuestionsJson, type FacultyExamQuestion, type FacultyMcqQuestion } from '@/lib/faculty-exams';

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

  const testsIdKind = await detectTestsIdKind(admin);
  const questionsIdKind = await detectQuestionsIdKind(admin);
  const testId = normalizeTestId(testRow.id, testsIdKind);
  const testIdStr = String(testId);

  const mcqQuestions = questions.filter((q): q is FacultyMcqQuestion => !isFacultyCodingQuestion(q));

  const questionRows = mcqQuestions.map((q) => {
    const row: Record<string, unknown> = {
      question_text: q.question_text,
      question_type: 'mcq',
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation ?? '',
      marks: 1,
      test_id: testsIdKind === 'bigint' ? Number(testIdStr) : testId,
    };
    return row;
  });

  let { data: inserted, error: qError } = await admin
    .from('questions')
    .insert(questionRows)
    .select('id');

  if (qError && isUuidTypeMismatchError(String(qError.message ?? ''))) {
    const fallbackRows = questionRows.map((r) => {
      const { test_id: _t, ...rest } = r;
      return rest;
    });
    const retry = await admin.from('questions').insert(fallbackRows).select('id');
    inserted = retry.data;
    qError = retry.error;
  }

  if (qError) throw new Error(qError.message);

  if (inserted?.length) {
    await linkTestQuestions(admin, testIdStr, inserted);
  }

  const approvedBase = {
    status: 'approved',
    reviewed_by: adminUserId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const publishedCandidates: Array<string | number> = [
    testId,
    testIdStr,
    ...(testsIdKind === 'bigint' ? [Number(testIdStr)] : []),
  ];

  let updateError: { message: string } | null = null;
  for (const publishedTestId of publishedCandidates) {
    const { error } = await admin
      .from('faculty_exam_requests')
      .update({ ...approvedBase, published_test_id: publishedTestId })
      .eq('id', requestId);
    if (!error) {
      return { testId: testIdStr };
    }
    updateError = error;
    if (!isUuidTypeMismatchError(String(error.message ?? ''))) {
      throw new Error(error.message);
    }
  }

  const { error: fallbackUpdateError } = await admin
    .from('faculty_exam_requests')
    .update({ ...approvedBase, published_test_id: testIdStr })
    .eq('id', requestId);

  if (!fallbackUpdateError) {
    return { testId: testIdStr };
  }

  const { error: statusOnlyError } = await admin
    .from('faculty_exam_requests')
    .update(approvedBase)
    .eq('id', requestId);

  if (statusOnlyError) {
    throw new Error(
      updateError?.message ??
        fallbackUpdateError.message ??
        statusOnlyError.message ??
        'Could not mark exam as approved',
    );
  }

  return { testId: testIdStr };
}
