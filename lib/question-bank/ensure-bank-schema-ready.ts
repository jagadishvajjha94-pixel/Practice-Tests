import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyQuestionBankSchemaMigrations,
  questionBankSchemaMissingMessage,
  waitForQuestionsTable,
} from '@/lib/question-bank/apply-bank-schema';
import {
  hasBankMcqColumns,
  probeQuestionsInsertShape,
  type QuestionsInsertShape,
} from '@/lib/question-bank/questions-insert-shape';

export type BankSchemaReadyResult = {
  shape: QuestionsInsertShape;
  warnings: string[];
};

async function needsColumnPatch(shape: QuestionsInsertShape): boolean {
  return (
    !shape.has('difficulty') ||
    !shape.has('option_a') ||
    !shape.has('tags') ||
    !shape.has('explanation')
  );
}

/** Ensure public.questions exists and exposes bank MCQ columns in PostgREST. */
export async function ensureBankSchemaReady(admin: SupabaseClient): Promise<BankSchemaReadyResult> {
  const warnings: string[] = [];

  let tableErr = await waitForQuestionsTable(admin, 2);
  if (tableErr?.includes('schema cache') || tableErr?.includes('does not exist')) {
    const applied = await applyQuestionBankSchemaMigrations();
    if (!applied.ok) {
      throw new Error(questionBankSchemaMissingMessage(applied));
    }
    warnings.push('Question bank tables were created/updated. If seed still fails, wait 30s and retry.');
    tableErr = await waitForQuestionsTable(admin, 8);
    if (tableErr) throw new Error(tableErr);
  } else if (tableErr) {
    throw new Error(tableErr);
  }

  let shape = await probeQuestionsInsertShape(admin);

  if (!hasBankMcqColumns(shape) || (await needsColumnPatch(shape))) {
    const applied = await applyQuestionBankSchemaMigrations();
    if (applied.ok) {
      warnings.push(
        'Added missing question bank columns (difficulty, options, tags, etc.). Retry seed after ~30 seconds if needed.',
      );
      await waitForQuestionsTable(admin, 8);
      shape = await probeQuestionsInsertShape(admin);
    } else if (!hasBankMcqColumns(shape)) {
      throw new Error(questionBankSchemaMissingMessage(applied));
    }
  }

  if (!hasBankMcqColumns(shape)) {
    throw new Error(
      'The questions table is missing MCQ columns (option_a–d or options). Run supabase/migrations/029_questions_bank_column_patch.sql in the Supabase SQL editor, wait 30s, then retry.',
    );
  }

  if (await needsColumnPatch(shape)) {
    warnings.push(
      'Some optional columns (e.g. difficulty) are still missing in the API schema. Seeding will omit them. Run migration 029 in Supabase SQL editor and reload the API schema.',
    );
  }

  return { shape, warnings };
}
