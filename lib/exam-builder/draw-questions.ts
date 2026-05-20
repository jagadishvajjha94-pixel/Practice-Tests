import type { SupabaseClient } from '@supabase/supabase-js';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getExcludedQuestionIds(
  admin: SupabaseClient,
  testType: string,
  slotKey: string,
): Promise<Set<string>> {
  const { data: priorDraws } = await admin
    .from('exam_builder_draws')
    .select('question_ids')
    .eq('test_type', testType)
    .eq('slot_key', slotKey)
    .order('created_at', { ascending: false })
    .limit(50);

  const excluded = new Set<string>();
  for (const row of priorDraws ?? []) {
    for (const id of (row.question_ids ?? []) as string[]) {
      excluded.add(id);
    }
  }
  return excluded;
}

async function questionIdsForTag(
  admin: SupabaseClient,
  tagId: string,
  tagSlug: string,
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: links } = await admin
    .from('question_tag_links')
    .select('question_id')
    .eq('tag_id', tagId);

  for (const row of links ?? []) {
    if (row.question_id) ids.add(row.question_id as string);
  }

  const { data: rows } = await admin.from('questions').select('id, tags, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation');
  for (const row of rows ?? []) {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    if (tags.some((t) => t === tagSlug || t === tagId)) {
      ids.add(row.id as string);
    }
  }

  return [...ids];
}

function rowToFacultyQuestion(row: Record<string, unknown>): FacultyExamQuestion | null {
  const text = String(row.question_text ?? '').trim();
  if (!text) return null;
  const letter = String(row.correct_answer ?? 'A').toUpperCase();
  const correct = ['A', 'B', 'C', 'D'].includes(letter) ? (letter as 'A' | 'B' | 'C' | 'D') : 'A';
  return {
    question_text: text,
    option_a: String(row.option_a ?? '').trim(),
    option_b: String(row.option_b ?? '').trim(),
    option_c: String(row.option_c ?? '').trim(),
    option_d: String(row.option_d ?? '').trim(),
    correct_answer: correct,
    explanation: row.explanation ? String(row.explanation) : undefined,
  };
}

export type ResolvedSyllabusTopic = { id: string; name: string; slug: string };

/** Resolve picker topic ids (UUID or slug) to tag rows for prompts and bank draws. */
export async function resolveSyllabusTopicsForBuilder(
  admin: SupabaseClient,
  topicIds: string[],
): Promise<ResolvedSyllabusTopic[]> {
  if (!topicIds.length) {
    throw new Error('Select at least one syllabus topic');
  }

  const { data: allTags } = await admin.from('question_tags').select('id, name, slug');

  const resolvedTags: ResolvedSyllabusTopic[] = [];
  for (const topicId of topicIds) {
    const byId = (allTags ?? []).find((t) => t.id === topicId);
    if (byId) {
      resolvedTags.push({ id: byId.id as string, name: byId.name as string, slug: byId.slug as string });
      continue;
    }
    const bySlug = (allTags ?? []).find((t) => t.slug === topicId);
    if (bySlug) {
      resolvedTags.push({ id: bySlug.id as string, name: bySlug.name as string, slug: bySlug.slug as string });
      continue;
    }
    resolvedTags.push({ id: topicId, name: topicId, slug: topicId });
  }

  if (!resolvedTags.length) {
    throw new Error('Selected syllabus topics not found');
  }

  return resolvedTags;
}

export type DrawExamQuestionsInput = {
  testType: string;
  topicIds: string[];
  questionsPerTopic: number;
  slotKey: string;
  createdBy: string;
};

export type DrawExamQuestionsResult = {
  questions: FacultyExamQuestion[];
  questionIds: string[];
  drawId: string;
  topicsUsed: { id: string; name: string; count: number }[];
  warnings: string[];
};

export async function drawExamQuestionsFromTopics(
  admin: SupabaseClient,
  input: DrawExamQuestionsInput,
): Promise<DrawExamQuestionsResult> {
  if (!input.topicIds.length) {
    throw new Error('Select at least one syllabus topic');
  }

  const excluded = await getExcludedQuestionIds(admin, input.testType, input.slotKey);
  const warnings: string[] = [];

  const resolvedTags = await resolveSyllabusTopicsForBuilder(admin, input.topicIds);

  const usedInPaper = new Set<string>();
  const orderedIds: string[] = [];
  const topicsUsed: { id: string; name: string; count: number }[] = [];

  for (const tag of resolvedTags) {
    const pool = shuffle(await questionIdsForTag(admin, tag.id as string, tag.slug as string)).filter(
      (id) => !excluded.has(id) && !usedInPaper.has(id),
    );

    if (pool.length < input.questionsPerTopic) {
      warnings.push(
        `"${tag.name}": only ${pool.length} fresh question(s) available for this slot (requested ${input.questionsPerTopic}).`,
      );
    }

    const picked = pool.slice(0, input.questionsPerTopic);
    if (picked.length === 0) {
      throw new Error(
        `No unused questions for "${tag.name}" in ${input.slotKey}. Try another slot or add more bank questions.`,
      );
    }

    topicsUsed.push({ id: tag.id as string, name: tag.name as string, count: picked.length });
    for (const id of picked) {
      usedInPaper.add(id);
      orderedIds.push(id);
    }
  }

  const { data: questionRows } = await admin.from('questions').select('*').in('id', orderedIds);

  const byId = new Map((questionRows ?? []).map((r) => [r.id as string, r]));
  const questions: FacultyExamQuestion[] = [];
  for (const id of orderedIds) {
    const row = byId.get(id);
    if (!row) continue;
    const q = rowToFacultyQuestion(row as Record<string, unknown>);
    if (q) questions.push(q);
  }

  const { data: drawRow, error: drawError } = await admin
    .from('exam_builder_draws')
    .insert({
      test_type: input.testType,
      slot_key: input.slotKey,
      topic_ids: input.topicIds,
      question_ids: orderedIds,
      created_by: input.createdBy,
    })
    .select('id')
    .single();

  if (drawError || !drawRow?.id) {
    throw new Error(drawError?.message ?? 'Could not record question draw for this slot');
  }

  return {
    questions,
    questionIds: orderedIds,
    drawId: drawRow.id as string,
    topicsUsed,
    warnings,
  };
}
