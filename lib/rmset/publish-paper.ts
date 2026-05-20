import type { SupabaseClient } from '@supabase/supabase-js';
import { RMSET_CATEGORY_SLUG } from '@/lib/rmset/types';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function ensureRmsetCategory(admin: SupabaseClient): Promise<string> {
  const { data: existing } = await admin
    .from('test_categories')
    .select('id')
    .eq('slug', RMSET_CATEGORY_SLUG)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await admin
    .from('test_categories')
    .insert({
      name: 'RMSET',
      slug: RMSET_CATEGORY_SLUG,
      description: 'Topic-selected eligibility test',
      icon: '📋',
    })
    .select('id')
    .single();

  if (error || !created?.id) {
    throw new Error(error?.message ?? 'Could not create RMSET category');
  }
  return created.id as string;
}

async function questionIdsForTopic(
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

  const { data: taggedRows } = await admin.from('questions').select('id, tags');

  for (const row of taggedRows ?? []) {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    if (tags.some((t) => t === tagSlug || t === tagId)) {
      ids.add(row.id as string);
    }
  }

  return [...ids];
}

export type PublishRmsetInput = {
  title: string;
  description?: string;
  topicIds: string[];
  questionsPerTopic: number;
  durationMinutes: number;
  createdBy: string;
  paperId?: string;
};

export async function publishRmsetPaper(
  admin: SupabaseClient,
  input: PublishRmsetInput,
): Promise<{ paperId: string; testId: string; totalQuestions: number }> {
  if (!input.topicIds.length) {
    throw new Error('Select at least one topic');
  }

  const { data: tags, error: tagError } = await admin
    .from('question_tags')
    .select('id, name, slug')
    .in('id', input.topicIds);

  if (tagError) throw new Error(tagError.message);
  if (!tags?.length) throw new Error('Selected topics not found');

  const used = new Set<string>();
  const orderedQuestionIds: string[] = [];

  for (const tag of tags) {
    const pool = shuffle(await questionIdsForTopic(admin, tag.id as string, tag.slug as string)).filter(
      (id) => !used.has(id),
    );
    const picked = pool.slice(0, input.questionsPerTopic);
    if (picked.length === 0) {
      throw new Error(`No questions found for topic "${tag.name}". Tag questions in the bank first.`);
    }
    for (const id of picked) {
      used.add(id);
      orderedQuestionIds.push(id);
    }
  }

  const categoryId = await ensureRmsetCategory(admin);
  const topicNames = tags.map((t) => t.name).join(', ');

  const { data: testRow, error: testError } = await admin
    .from('tests')
    .insert({
      category_id: categoryId,
      title: input.title.trim(),
      description:
        input.description?.trim() ||
        `RMSET paper covering: ${topicNames}. ${orderedQuestionIds.length} MCQs.`,
      duration_minutes: input.durationMinutes,
      total_questions: orderedQuestionIds.length,
      difficulty: 'medium',
    })
    .select('id')
    .single();

  if (testError || !testRow?.id) {
    throw new Error(testError?.message ?? 'Failed to create RMSET test');
  }

  const testId = testRow.id as string;

  const links = orderedQuestionIds.map((questionId, idx) => ({
    test_id: testId,
    question_id: questionId,
    order: idx + 1,
  }));

  const { error: linkError } = await admin.from('test_questions').upsert(links, {
    onConflict: 'test_id,question_id',
  });
  if (linkError) throw new Error(linkError.message);

  await admin
    .from('rmset_papers')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('status', 'published');

  const paperPayload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    test_id: testId,
    topic_ids: input.topicIds,
    questions_per_topic: input.questionsPerTopic,
    duration_minutes: input.durationMinutes,
    status: 'published',
    created_by: input.createdBy,
    updated_at: new Date().toISOString(),
  };

  if (input.paperId) {
    const { data: updated, error: updateError } = await admin
      .from('rmset_papers')
      .update(paperPayload)
      .eq('id', input.paperId)
      .select('id')
      .single();
    if (updateError || !updated?.id) throw new Error(updateError?.message ?? 'Could not update paper');
    return { paperId: updated.id as string, testId, totalQuestions: orderedQuestionIds.length };
  }

  const { data: created, error: createError } = await admin
    .from('rmset_papers')
    .insert(paperPayload)
    .select('id')
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message ?? 'Could not save RMSET paper');
  }

  return { paperId: created.id as string, testId, totalQuestions: orderedQuestionIds.length };
}
