import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import {
  isPostgresConfigured,
  readQuestionBankBootstrapSql,
} from '@/lib/question-bank/apply-bank-schema';
import { supabaseSqlEditorUrl } from '@/lib/postgres-url';

export const runtime = 'nodejs';

/** Returns combined 020+021 SQL for Supabase SQL editor (when POSTGRES_URL is not configured). */
export async function GET() {
  const auth = await requireAuth(['admin', 'faculty']);
  if ('response' in auth) return auth.response;

  try {
    const sql = readQuestionBankBootstrapSql();
    return NextResponse.json({
      sql,
      sqlEditorUrl: supabaseSqlEditorUrl(),
      postgresConfigured: isPostgresConfigured(),
      steps: [
        'Open Supabase SQL editor (link below).',
        'Paste the SQL and click Run.',
        'Wait ~30 seconds for the API schema cache to refresh.',
        'Return here and click Load topic question bank.',
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read bootstrap SQL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
