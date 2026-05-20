import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { supabaseSqlEditorUrl } from '@/lib/postgres-url';
import { isPostgresConfigured } from '@/lib/question-bank/apply-bank-schema';

export async function GET() {
  const auth = await requireAuth(['admin', 'faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Server configuration missing' }, { status: 500 });
  }

  const { error: qErr, count: questionCount } = await admin
    .from('questions')
    .select('id', { count: 'exact', head: true });

  const { data: tags, error: tErr } = await admin.from('question_tags').select('id, slug, name').order('name');

  let curatedCount = 0;
  if (!qErr) {
    const { count } = await admin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .contains('tags', ['curated-bank-v2']);
    curatedCount = count ?? 0;
  }

  const tableMissing =
    Boolean(qErr?.message?.includes('schema cache')) ||
    Boolean(qErr?.message?.includes('does not exist'));

  return NextResponse.json({
    ok: !tableMissing,
    tableMissing,
    questionsTotal: questionCount ?? 0,
    curatedBankCount: curatedCount,
    tagCount: tags?.length ?? 0,
    tags: tags ?? [],
    errors: [qErr?.message, tErr?.message].filter(Boolean),
    hint: tableMissing
      ? isPostgresConfigured()
        ? 'Click "Setup question bank tables" below, or copy bootstrap SQL into Supabase SQL editor.'
        : 'Click "Copy bootstrap SQL" → paste in Supabase SQL editor → Run → wait 30s → Load topic bank.'
      : curatedCount === 0
        ? 'Click "Load topic question bank" to populate MCQs, then Draw from bank.'
        : null,
    sqlEditorUrl: tableMissing ? supabaseSqlEditorUrl() : null,
    postgresConfigured: isPostgresConfigured(),
  });
}
