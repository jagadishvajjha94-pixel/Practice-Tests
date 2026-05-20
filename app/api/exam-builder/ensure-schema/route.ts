import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  applyQuestionBankSchemaMigrations,
  waitForQuestionsTable,
} from '@/lib/question-bank/apply-bank-schema';

export const runtime = 'nodejs';

/** Creates question bank tables (migrations 020 + 021) when POSTGRES_URL or SUPABASE_DB_PASSWORD is set. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(['admin', 'faculty'], request);
  if ('response' in auth) return auth.response;

  const result = await applyQuestionBankSchemaMigrations();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        hint: result.hint,
        sqlEditorUrl: result.sqlEditorUrl,
        applied: result.applied ?? [],
      },
      { status: 400 },
    );
  }

  const admin = getServiceSupabase();
  let tableReady = true;
  let waitError: string | null = null;
  if (admin) {
    waitError = await waitForQuestionsTable(admin);
    tableReady = waitError == null;
  }

  return NextResponse.json({
    ok: true,
    applied: result.applied,
    tableReady,
    waitError,
    sqlEditorUrl: result.sqlEditorUrl,
    message: tableReady
      ? 'Question bank tables are ready. Click "Load topic question bank".'
      : 'Migrations applied. Wait ~30 seconds, then retry Load topic bank.',
  });
}
