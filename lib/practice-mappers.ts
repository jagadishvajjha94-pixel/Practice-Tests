import type { Question, Test } from '@/lib/types';

/** Compare stored correct key (often A/B/C/D) with what the UI captured. */
export function answersMatchMcq(user: unknown, correct: unknown): boolean {
  const u = String(user ?? '').trim().toUpperCase();
  const e = String(correct ?? '').trim().toUpperCase();
  if (u === e) return true;
  const u1 = u.charAt(0);
  const e1 = e.charAt(0);
  if (/^[ABCD]$/.test(u1) && /^[ABCD]$/.test(e1)) return u1 === e1;
  return false;
}

/** Map Supabase `tests` rows (legacy column names) to UI `Test` shape */
export function adaptTestRow(row: Record<string, unknown>): Test {
  const title = (row.title as string | undefined) ?? (row.name as string | undefined) ?? 'Practice test';
  const durationMinutes = Number(
    row.duration_minutes ?? row.duration ?? 60
  );
  const difficulty = (row.difficulty ?? row.difficulty_level ?? 'medium') as
    | 'easy'
    | 'medium'
    | 'hard';

  const qLimit = row.question_time_limit_sec ?? row.question_time_seconds;
  const question_time_limit_sec =
    qLimit != null && !Number.isNaN(Number(qLimit)) ? Number(qLimit) : null;

  const catEmbed = row.test_categories as { slug?: string } | { slug?: string }[] | null | undefined;
  let categorySlug: string | undefined;
  if (catEmbed && typeof catEmbed === 'object') {
    if (Array.isArray(catEmbed)) {
      categorySlug = catEmbed[0]?.slug;
    } else {
      categorySlug = catEmbed.slug;
    }
  }

  return {
    id: String(row.id),
    name: title,
    category_id: String(row.category_id ?? ''),
    duration: durationMinutes,
    total_questions: Number(row.total_questions ?? 0),
    passing_score: row.passing_score != null ? Number(row.passing_score) : null,
    description: (row.description as string | undefined) ?? null,
    difficulty_level: difficulty ?? null,
    is_paid: Boolean(row.is_paid ?? false),
    created_at: (row.created_at as string | undefined) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string | undefined) ?? new Date().toISOString(),
    question_time_limit_sec,
    category_slug: categorySlug ?? null,
  };
}

/** Normalize practice questions from DB (option_a … option_d / question_type mcq). */
export function adaptQuestionRow(row: Record<string, unknown>): Question {
  const qa = typeof row.question_type === 'string' ? row.question_type : row.type;

  let type: Question['type'] =
    qa === 'coding'
      ? 'coding'
      : qa === 'numeric'
        ? 'numeric'
        : qa === 'verbal'
          ? 'verbal'
          : 'MCQ';

  const optsFromJson = Array.isArray(row.options)
    ? row.options.map(String)
    : null;

  const ans = String(row.correct_answer ?? '').trim().toUpperCase();
  const correct_answer = ans.length <= 2 && /^[ABCD]$/.test(ans.slice(0, 1))
    ? ans.slice(0, 1)
    : ans;

  return {
    id: String(row.id),
    category_id: String(row.category_id ?? ''),
    difficulty:
      ((row.difficulty as Question['difficulty'] | undefined) ?? 'medium') as Question['difficulty'],
    question_text: String(row.question_text ?? ''),
    type,
    options: optsFromJson,
    correct_answer,
    explanation: (row.explanation as string | null | undefined) ?? null,
    tags: Array.isArray(row.tags)
      ? (row.tags as string[])
      : null,
    created_at: (row.created_at as string | undefined) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string | undefined) ?? new Date().toISOString(),
    question_type: typeof row.question_type === 'string' ? row.question_type : undefined,
    option_a:
      typeof row.option_a === 'string' || row.option_a == null ? (row.option_a as string | null) : String(row.option_a),
    option_b:
      typeof row.option_b === 'string' || row.option_b == null ? (row.option_b as string | null) : String(row.option_b),
    option_c:
      typeof row.option_c === 'string' || row.option_c == null ? (row.option_c as string | null) : String(row.option_c),
    option_d:
      typeof row.option_d === 'string' || row.option_d == null ? (row.option_d as string | null) : String(row.option_d),
    coding_problem_id:
      typeof row.coding_problem_id === 'string' ? row.coding_problem_id : null,
    coding_title: typeof row.title === 'string' ? row.title : null,
    coding_sample_input:
      typeof row.sample_input === 'string' ? row.sample_input : null,
    coding_sample_output:
      typeof row.sample_output === 'string' ? row.sample_output : null,
    coding_input_format:
      typeof row.input_format === 'string' ? row.input_format : null,
    coding_output_format:
      typeof row.output_format === 'string' ? row.output_format : null,
    coding_hint: typeof row.hint === 'string' ? row.hint : null,
  };
}

export function isCodingQuestion(question: {
  type?: string;
  question_type?: string;
  coding_problem_id?: string | null;
}): boolean {
  return (
    question.type === 'coding' ||
    question.question_type === 'coding' ||
    Boolean(question.coding_problem_id)
  );
}

/** Row from `test_questions` select with `question:questions(*)`. */
export function extractJoinedQuestion(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return null;
  const nested = (row as { question?: unknown }).question;
  if (Array.isArray(nested)) {
    const first = nested[0];
    return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
  }
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  return null;
}
