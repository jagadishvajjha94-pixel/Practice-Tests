import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import type { SupabaseClient } from '@supabase/supabase-js';
import { postgresUrlSetupHint, resolvePostgresUrl, supabaseSqlEditorUrl } from '@/lib/postgres-url';

const MIGRATION_FILES = [
  '020_ensure_questions_table.sql',
  '021_questions_test_id_nullable.sql',
];

export type ApplyBankSchemaResult = {
  ok: boolean;
  applied?: string[];
  error?: string;
  hint?: string;
  sqlEditorUrl?: string | null;
};

/** Apply question-bank DDL (020 + 021) via direct Postgres. Safe to re-run. */
export async function applyQuestionBankSchemaMigrations(): Promise<ApplyBankSchemaResult> {
  const sqlEditorUrl = supabaseSqlEditorUrl();
  const postgresUrl = resolvePostgresUrl();
  if (!postgresUrl) {
    return {
      ok: false,
      error: 'Database connection not configured',
      hint: `${postgresUrlSetupHint()} Or open Supabase SQL editor and run migration 020, then 021.`,
      sqlEditorUrl,
    };
  }

  const client = postgres(postgresUrl, { max: 1, onnotice: () => {} });
  const applied: string[] = [];
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file missing: ${file}`);
      }
      const content = fs.readFileSync(filePath, 'utf8');
      await client.unsafe(content);
      applied.push(file);
    }
    try {
      await client`NOTIFY pgrst, 'reload schema'`;
    } catch {
      /* optional on some hosts */
    }
    await client.end();
    return { ok: true, applied, sqlEditorUrl };
  } catch (err) {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    const message = err instanceof Error ? err.message : 'Migration failed';
    return {
      ok: false,
      applied,
      error: message,
      hint: applied.length
        ? `Partial apply (${applied.join(', ')}). Fix the error and retry, or finish in SQL editor.`
        : 'Run 020_ensure_questions_table.sql then 021_questions_test_id_nullable.sql in Supabase SQL editor.',
      sqlEditorUrl,
    };
  }
}

export function questionBankSchemaMissingMessage(applyResult?: ApplyBankSchemaResult): string {
  const sqlEditorUrl = applyResult?.sqlEditorUrl ?? supabaseSqlEditorUrl();
  const lines = [
    'Table public.questions is missing or not visible to the API.',
    applyResult?.ok
      ? 'Migrations were applied — wait a few seconds and retry "Load topic bank".'
      : applyResult?.error
        ? `Auto-setup failed: ${applyResult.error}`
        : 'Run migrations 020 and 021 in Supabase.',
    applyResult?.hint ?? postgresUrlSetupHint(),
  ];
  if (sqlEditorUrl) {
    lines.push(`SQL editor: ${sqlEditorUrl}`);
  }
  return lines.filter(Boolean).join(' ');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Probe until PostgREST sees public.questions (schema cache reload). */
export async function waitForQuestionsTable(
  admin: SupabaseClient,
  maxAttempts = 6,
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const { error } = await admin.from('questions').select('id').limit(1);
    if (!error) return null;
    const msg = error.message;
    if (!msg.includes('schema cache') && !msg.includes('does not exist')) {
      return msg;
    }
    if (i < maxAttempts - 1) await sleep(1500);
  }
  return 'public.questions still not in API schema cache — wait 30s and retry, or reload Supabase API schema.';
}
