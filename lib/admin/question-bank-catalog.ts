import type { SupabaseClient } from '@supabase/supabase-js';
import {
  questionIdsForTag,
  type ResolvedSyllabusTopic,
} from '@/lib/exam-builder/draw-questions';
import {
  RMSET_CORE_UNITS,
  SYLLABUS_GROUPS,
  type SyllabusGroupKey,
  type SyllabusUnit,
} from '@/lib/exam-builder/syllabus';
import { looksLikeUuid, normalizeQuestionId } from '@/lib/exam-builder/id-utils';

const QUESTION_PAGE = 200;

export type QuestionBankSectionKey = SyllabusGroupKey | 'other' | 'uncategorized';

export const QUESTION_BANK_SECTION_LABELS: Record<QuestionBankSectionKey, string> = {
  aptitude: 'Aptitude',
  logical: 'Logical reasoning',
  technical: 'Technical / CS',
  verbal: 'Verbal & English',
  rmset: 'RMSET & eligibility',
  other: 'Other topics',
  uncategorized: 'Uncategorized',
};

export type QuestionBankTopicSummary = {
  id: string;
  slug: string;
  name: string;
  question_count: number;
};

export type QuestionBankSectionSummary = {
  key: QuestionBankSectionKey;
  name: string;
  topics: QuestionBankTopicSummary[];
  question_count: number;
};

export type QuestionBankOverview = {
  total_questions: number;
  total_topics: number;
  sections: QuestionBankSectionSummary[];
};

export type QuestionBankRow = {
  id: string;
  question_text: string;
  difficulty: string;
  type: string;
  correct_answer: string;
  explanation: string | null;
  options: string[] | null;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  tags: string[] | null;
  category_id: string | null;
  created_at: string | null;
};

const slugToSection = (() => {
  const map = new Map<string, QuestionBankSectionKey>();
  for (const key of Object.keys(SYLLABUS_GROUPS) as SyllabusGroupKey[]) {
    for (const unit of SYLLABUS_GROUPS[key]) {
      map.set(unit.slug, key);
    }
  }
  for (const unit of RMSET_CORE_UNITS) {
    if (!map.has(unit.slug)) map.set(unit.slug, 'rmset');
  }
  return map;
})();

export function sectionKeyForTopicSlug(slug: string): QuestionBankSectionKey {
  return slugToSection.get(slug) ?? 'other';
}

async function countQuestionsForTag(
  admin: SupabaseClient,
  tag: { id: string; slug: string },
): Promise<number> {
  const ids = await questionIdsForTag(admin, tag.id, tag.slug);
  return ids.length;
}

async function countUncategorizedQuestions(admin: SupabaseClient): Promise<number> {
  const taggedIds = new Set<string>();
  const { data: links } = await admin.from('question_tag_links').select('question_id');
  for (const row of links ?? []) {
    if (row.question_id != null) taggedIds.add(normalizeQuestionId(row.question_id));
  }

  let offset = 0;
  let uncategorized = 0;
  for (;;) {
    const { data, error } = await admin
      .from('questions')
      .select('id, tags')
      .range(offset, offset + 900 - 1);
    if (error) break;
    const rows = data ?? [];
    for (const row of rows) {
      const id = normalizeQuestionId(row.id);
      if (taggedIds.has(id)) continue;
      const tags = row.tags as string[] | null;
      if (Array.isArray(tags) && tags.length > 0) continue;
      uncategorized += 1;
    }
    if (rows.length < 900) break;
    offset += 900;
  }
  return uncategorized;
}

export async function loadQuestionBankOverview(
  admin: SupabaseClient,
): Promise<QuestionBankOverview> {
  const { data: tagRows, error: tagErr } = await admin
    .from('question_tags')
    .select('id, slug, name')
    .order('name');

  if (tagErr) throw new Error(tagErr.message);

  const topics: QuestionBankTopicSummary[] = [];
  for (const row of tagRows ?? []) {
    const id = String(row.id);
    const slug = String(row.slug ?? '');
    const name = String(row.name ?? slug);
    if (!slug) continue;
    const question_count = await countQuestionsForTag(admin, { id, slug });
    topics.push({ id, slug, name, question_count });
  }

  const uncategorizedCount = await countUncategorizedQuestions(admin);

  const sectionMap = new Map<QuestionBankSectionKey, QuestionBankTopicSummary[]>();
  const ensure = (key: QuestionBankSectionKey) => {
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    return sectionMap.get(key)!;
  };

  for (const topic of topics) {
    ensure(sectionKeyForTopicSlug(topic.slug)).push(topic);
  }

  if (uncategorizedCount > 0) {
    ensure('uncategorized').push({
      id: 'uncategorized',
      slug: 'uncategorized',
      name: 'No topic tag',
      question_count: uncategorizedCount,
    });
  }

  const sectionOrder: QuestionBankSectionKey[] = [
    'aptitude',
    'logical',
    'technical',
    'verbal',
    'rmset',
    'other',
    'uncategorized',
  ];

  const sections: QuestionBankSectionSummary[] = sectionOrder
    .filter((key) => (sectionMap.get(key)?.length ?? 0) > 0)
    .map((key) => {
      const list = [...(sectionMap.get(key) ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return {
        key,
        name: QUESTION_BANK_SECTION_LABELS[key],
        topics: list,
        question_count: list.reduce((sum, t) => sum + t.question_count, 0),
      };
    });

  const { count: tableTotal } = await admin
    .from('questions')
    .select('id', { count: 'exact', head: true });

  return {
    total_questions: tableTotal ?? sections.reduce((sum, s) => sum + s.question_count, 0),
    total_topics: topics.length,
    sections,
  };
}

function rowToBankQuestion(row: Record<string, unknown>): QuestionBankRow {
  const optionsRaw = row.options;
  let options: string[] | null = null;
  if (Array.isArray(optionsRaw)) {
    options = optionsRaw.map(String);
  }
  const tagsRaw = row.tags;
  let tags: string[] | null = null;
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map(String);
  }

  return {
    id: normalizeQuestionId(row.id),
    question_text: String(row.question_text ?? ''),
    difficulty: String(row.difficulty ?? 'medium'),
    type: String(row.type ?? row.question_type ?? 'MCQ'),
    correct_answer: String(row.correct_answer ?? ''),
    explanation: row.explanation != null ? String(row.explanation) : null,
    options,
    option_a: row.option_a != null ? String(row.option_a) : null,
    option_b: row.option_b != null ? String(row.option_b) : null,
    option_c: row.option_c != null ? String(row.option_c) : null,
    option_d: row.option_d != null ? String(row.option_d) : null,
    tags,
    category_id: row.category_id != null ? String(row.category_id) : null,
    created_at: row.created_at != null ? String(row.created_at) : null,
  };
}

async function loadUncategorizedQuestionIds(admin: SupabaseClient): Promise<string[]> {
  const taggedIds = new Set<string>();
  const { data: links } = await admin.from('question_tag_links').select('question_id');
  for (const row of links ?? []) {
    if (row.question_id != null) taggedIds.add(normalizeQuestionId(row.question_id));
  }

  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin
      .from('questions')
      .select('id, tags')
      .order('created_at', { ascending: false })
      .range(offset, offset + 900 - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) {
      const id = normalizeQuestionId(row.id);
      if (taggedIds.has(id)) continue;
      const tags = row.tags as string[] | null;
      if (Array.isArray(tags) && tags.length > 0) continue;
      out.push(id);
    }
    if (rows.length < 900) break;
    offset += 900;
  }
  return out;
}

export async function loadQuestionsForTopic(
  admin: SupabaseClient,
  topicSlug: string,
  options?: { offset?: number; limit?: number },
): Promise<{ topic: ResolvedSyllabusTopic | null; total: number; questions: QuestionBankRow[] }> {
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.min(Math.max(1, options?.limit ?? QUESTION_PAGE), 500);

  let topic: ResolvedSyllabusTopic | null = null;
  let allIds: string[] = [];

  if (topicSlug === 'uncategorized') {
    topic = { id: 'uncategorized', slug: 'uncategorized', name: 'No topic tag' };
    allIds = await loadUncategorizedQuestionIds(admin);
  } else {
    const { data: tagRow } = await admin
      .from('question_tags')
      .select('id, slug, name')
      .eq('slug', topicSlug)
      .maybeSingle();

    if (!tagRow?.id) {
      return { topic: null, total: 0, questions: [] };
    }

    topic = {
      id: String(tagRow.id),
      slug: String(tagRow.slug),
      name: String(tagRow.name ?? topicSlug),
    };
    allIds = await questionIdsForTag(admin, topic.id, topic.slug);
  }

  const total = allIds.length;
  const pageIds = allIds.slice(offset, offset + limit);
  if (pageIds.length === 0) {
    return { topic, total, questions: [] };
  }

  const { data: rows, error } = await admin.from('questions').select('*').in('id', pageIds);
  if (error) throw new Error(error.message);

  const byId = new Map((rows ?? []).map((r) => [normalizeQuestionId(r.id), r]));
  const questions: QuestionBankRow[] = [];
  for (const id of pageIds) {
    const row = byId.get(id);
    if (row) questions.push(rowToBankQuestion(row as Record<string, unknown>));
  }

  return { topic, total, questions };
}

/** All syllabus units grouped by section (static catalog for exam builder). */
export function staticSyllabusSections(): Array<{
  key: SyllabusGroupKey;
  name: string;
  units: SyllabusUnit[];
}> {
  return (Object.keys(SYLLABUS_GROUPS) as SyllabusGroupKey[]).map((key) => ({
    key,
    name: QUESTION_BANK_SECTION_LABELS[key],
    units: [...SYLLABUS_GROUPS[key]],
  }));
}
