import type { SupabaseClient } from '@supabase/supabase-js';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';
import {
  allSyllabusTagDefs,
  CURATED_BANK_MARKER,
  getCuratedMcqsForSlug,
} from '@/lib/question-bank/curated-mcqs';

export type SeedCuratedBankResult = {
  tagsEnsured: number;
  questionsInserted: number;
  linksCreated: number;
  perTopic: Array<{ slug: string; name: string; inserted: number }>;
  warnings: string[];
};

const INSERT_BATCH = 40;

async function ensureTables(admin: SupabaseClient): Promise<string | null> {
  const { error } = await admin.from('questions').select('id').limit(1);
  if (error?.message?.includes('schema cache') || error?.message?.includes('does not exist')) {
    return (
      'Table public.questions is missing. Run migration 020_ensure_questions_table.sql in Supabase SQL editor, then retry "Load topic bank".'
    );
  }
  return null;
}

async function upsertTag(
  admin: SupabaseClient,
  def: { slug: string; name: string },
): Promise<{ id: string; slug: string; name: string } | null> {
  const { data: existing } = await admin
    .from('question_tags')
    .select('id, slug, name')
    .eq('slug', def.slug)
    .maybeSingle();

  if (existing?.id) {
    return { id: existing.id as string, slug: existing.slug as string, name: existing.name as string };
  }

  const { data: inserted, error } = await admin
    .from('question_tags')
    .insert({ name: def.name, slug: def.slug })
    .select('id, slug, name')
    .single();

  if (error) {
    const { data: again } = await admin
      .from('question_tags')
      .select('id, slug, name')
      .eq('slug', def.slug)
      .maybeSingle();
    if (again?.id) {
      return { id: again.id as string, slug: again.slug as string, name: again.name as string };
    }
    return null;
  }

  return inserted
    ? { id: inserted.id as string, slug: inserted.slug as string, name: inserted.name as string }
    : null;
}

function rowFromMcq(
  q: FacultyExamQuestion,
  tagSlug: string,
  tagId: string,
): Record<string, unknown> {
  return {
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? `${CURATED_BANK_MARKER} · ${tagSlug}`,
    type: 'MCQ',
    question_type: 'MCQ',
    difficulty: 'medium',
    tags: [tagSlug, tagId, CURATED_BANK_MARKER],
    marks: 1,
  };
}

export async function seedCuratedQuestionBank(
  admin: SupabaseClient,
  options?: { questionsPerTopic?: number; replaceExisting?: boolean },
): Promise<SeedCuratedBankResult> {
  const questionsPerTopic = Math.min(50, Math.max(5, options?.questionsPerTopic ?? 20));
  const warnings: string[] = [];
  const perTopic: SeedCuratedBankResult['perTopic'] = [];

  const tableErr = await ensureTables(admin);
  if (tableErr) {
    throw new Error(tableErr);
  }

  if (options?.replaceExisting !== false) {
    await admin.from('questions').delete().contains('tags', [CURATED_BANK_MARKER]);
  }

  const defs = allSyllabusTagDefs();
  let tagsEnsured = 0;
  let questionsInserted = 0;
  let linksCreated = 0;

  for (const def of defs) {
    const tag = await upsertTag(admin, def);
    if (!tag) {
      warnings.push(`Could not ensure tag for ${def.slug}`);
      continue;
    }
    tagsEnsured += 1;

    const mcqs = getCuratedMcqsForSlug(def.slug, def.name, questionsPerTopic);
    let topicInserted = 0;

    for (let i = 0; i < mcqs.length; i += INSERT_BATCH) {
      const batch = mcqs.slice(i, i + INSERT_BATCH).map((q) => rowFromMcq(q, tag.slug, tag.id));
      const { data, error } = await admin.from('questions').insert(batch).select('id');
      if (error) {
        warnings.push(`${def.slug}: insert failed — ${error.message}`);
        break;
      }
      const ids = (data ?? []).map((r) => r.id as string);
      topicInserted += ids.length;
      questionsInserted += ids.length;

      if (ids.length) {
        const linkRows = ids.map((question_id) => ({ question_id, tag_id: tag.id }));
        const { error: linkErr } = await admin.from('question_tag_links').insert(linkRows);
        if (linkErr) {
          warnings.push(`${def.slug}: tag links failed — ${linkErr.message}`);
        } else {
          linksCreated += linkRows.length;
        }
      }
    }

    perTopic.push({ slug: def.slug, name: def.name, inserted: topicInserted });
  }

  return {
    tagsEnsured,
    questionsInserted,
    linksCreated,
    perTopic,
    warnings,
  };
}
