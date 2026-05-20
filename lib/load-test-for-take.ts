import type { SupabaseClient } from '@supabase/supabase-js';
import { parseQuestionsJson, type FacultyExamQuestion } from '@/lib/faculty-exams';
import { adaptQuestionRow, adaptTestRow, extractJoinedQuestion } from '@/lib/practice-mappers';
import type { Question, Test } from '@/lib/types';

function testIdVariants(testId: string): (string | number)[] {
  const out: (string | number)[] = [testId];
  if (/^\d+$/.test(testId.trim())) {
    const n = Number(testId);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export function facultyQuestionsToUiQuestions(
  items: FacultyExamQuestion[],
  testId: string,
): Question[] {
  const now = new Date().toISOString();
  return items.map((q, index) => ({
    id: `${testId}-q${index + 1}`,
    category_id: '',
    difficulty: 'medium' as const,
    question_text: q.question_text,
    type: 'MCQ' as const,
    options: [q.option_a, q.option_b, q.option_c, q.option_d],
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? null,
    tags: null,
    created_at: now,
    updated_at: now,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
  }));
}

/** Load a test row (legacy schemas: bigint id, title vs name, optional category embed). */
export async function loadTestRowForTake(
  client: SupabaseClient,
  testId: string,
): Promise<Test | null> {
  const selects = [
    '*, test_categories(slug)',
    'id, title, name, category_id, duration_minutes, duration, total_questions, description, difficulty, difficulty_level, passing_score, is_paid, created_at, updated_at, question_time_limit_sec, question_time_seconds',
    'id, title, category_id, duration_minutes, total_questions, description',
    'id, name, category_id, duration, total_questions, description',
    '*',
  ];

  for (const columns of selects) {
    for (const id of testIdVariants(testId)) {
      const { data, error } = await client.from('tests').select(columns).eq('id', id).maybeSingle();
      if (error) continue;
      if (!data) continue;

      const test = adaptTestRow(data as Record<string, unknown>);
      if (!test.category_slug && test.category_id) {
        const { data: cat } = await client
          .from('test_categories')
          .select('slug')
          .eq('id', test.category_id)
          .maybeSingle();
        if (cat?.slug) test.category_slug = cat.slug as string;
      }
      return test;
    }
  }

  for (const id of testIdVariants(testId)) {
    const { data: fer } = await client
      .from('faculty_exam_requests')
      .select('title, description, duration_minutes, questions_json, published_test_id')
      .eq('published_test_id', String(id))
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (!fer?.title) continue;

    const qs = parseQuestionsJson(fer.questions_json);
    const now = new Date().toISOString();
    return {
      id: String(testId),
      name: fer.title as string,
      category_id: '',
      duration: Number(fer.duration_minutes ?? 30),
      total_questions: qs.length,
      passing_score: null,
      description: (fer.description as string | null) ?? null,
      difficulty_level: 'medium',
      is_paid: false,
      created_at: now,
      updated_at: now,
      question_time_limit_sec: null,
      category_slug: 'department-exams',
    };
  }

  return null;
}

/** Load MCQs for a test (test_questions join, questions.test_id, or faculty JSON fallback). */
export async function loadQuestionsForTake(
  client: SupabaseClient,
  testId: string,
): Promise<Question[]> {
  for (const id of testIdVariants(testId)) {
    const { data: directQs, error: directErr } = await client
      .from('questions')
      .select('*')
      .eq('test_id', id)
      .order('id', { ascending: true });

    if (!directErr && directQs?.length) {
      return directQs.map((q) => adaptQuestionRow(q as Record<string, unknown>));
    }
  }

  for (const id of testIdVariants(testId)) {
    const { data: links, error: linkErr } = await client
      .from('test_questions')
      .select('question_id, order')
      .eq('test_id', id)
      .order('order', { ascending: true });

    if (linkErr || !links?.length) continue;

    const questionIds = links
      .map((l) => l.question_id)
      .filter((qid): qid is string | number => qid != null);

    if (!questionIds.length) continue;

    const { data: qs, error: qErr } = await client.from('questions').select('*').in('id', questionIds);
    if (qErr || !qs?.length) continue;

    const byId = new Map(qs.map((q) => [String((q as { id: unknown }).id), q]));
    const ordered: Question[] = [];
    for (const link of links) {
      const row = byId.get(String(link.question_id));
      if (row) ordered.push(adaptQuestionRow(row as Record<string, unknown>));
    }
    if (ordered.length) return ordered;

    const { data: joined, error: joinErr } = await client
      .from('test_questions')
      .select('order, question:questions(*)')
      .eq('test_id', id)
      .order('order', { ascending: true });

    if (!joinErr && joined?.length) {
      const fromJoin = joined
        .map(extractJoinedQuestion)
        .filter((q): q is Record<string, unknown> => q != null)
        .map(adaptQuestionRow);
      if (fromJoin.length) return fromJoin;
    }
  }

  for (const id of testIdVariants(testId)) {
    const publishedId = String(id);
    const { data: fer } = await client
      .from('faculty_exam_requests')
      .select('questions_json')
      .eq('published_test_id', publishedId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    const parsed = parseQuestionsJson(fer?.questions_json);
    if (parsed.length) {
      return facultyQuestionsToUiQuestions(parsed, String(testId));
    }
  }

  return [];
}

export async function loadTestBundleForTake(
  client: SupabaseClient,
  testId: string,
): Promise<{ test: Test | null; questions: Question[] }> {
  const test = await loadTestRowForTake(client, testId);
  const questions = await loadQuestionsForTake(client, testId);
  return { test, questions };
}
