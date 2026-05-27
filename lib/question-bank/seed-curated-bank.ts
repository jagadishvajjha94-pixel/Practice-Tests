import type { SupabaseClient } from '@supabase/supabase-js';
import { allSyllabusTagDefs, CURATED_BANK_MARKER } from '@/lib/question-bank/curated-mcqs';
import {
  DEFAULT_SYLLABUS_QUESTIONS_PER_TOPIC,
  generateSyllabusMcqsForSlug,
  MAX_SYLLABUS_QUESTIONS_PER_TOPIC,
} from '@/lib/question-bank/syllabus-mcq-generator';
import { ensureQuestionBankPoolTestId } from '@/lib/question-bank/ensure-bank-test';
import { ensureBankSchemaReady } from '@/lib/question-bank/ensure-bank-schema-ready';
import { mcqToQuestionRow } from '@/lib/question-bank/questions-insert-shape';

export type SeedCuratedBankResult = {
  tagsEnsured: number;
  questionsInserted: number;
  linksCreated: number;
  perTopic: Array<{ slug: string; name: string; inserted: number }>;
  warnings: string[];
};

const INSERT_BATCH = 40;

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

export async function seedCuratedQuestionBank(
  admin: SupabaseClient,
  options?: { questionsPerTopic?: number; replaceExisting?: boolean },
): Promise<SeedCuratedBankResult> {
  const questionsPerTopic = Math.min(
    MAX_SYLLABUS_QUESTIONS_PER_TOPIC,
    Math.max(10, options?.questionsPerTopic ?? DEFAULT_SYLLABUS_QUESTIONS_PER_TOPIC),
  );
  const warnings: string[] = [];
  const perTopic: SeedCuratedBankResult['perTopic'] = [];

  const tableErr = await ensureTables(admin);
  if (tableErr) {
    throw new Error(tableErr);
  }

  const poolTestId = await ensureQuestionBankPoolTestId(admin);
  if (poolTestId == null) {
    throw new Error(
      'Could not create Question Bank Pool test (questions.test_id is required on this database). Ensure test_categories/tests exist, or run migration 021_questions_test_id_nullable.sql in Supabase SQL editor.',
    );
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

    const mcqs = generateSyllabusMcqsForSlug(def.slug, def.name, questionsPerTopic);
    let topicInserted = 0;

    for (let i = 0; i < mcqs.length; i += INSERT_BATCH) {
      const batch = mcqs
        .slice(i, i + INSERT_BATCH)
        .map((q) =>
          mcqToQuestionRow(q, shape, {
            tagSlug: tag.slug,
            tagId: tag.id,
            poolTestId,
          }),
        );
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
