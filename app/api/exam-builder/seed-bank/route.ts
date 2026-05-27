import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { seedCuratedQuestionBank } from '@/lib/question-bank/seed-curated-bank';
import { supabaseSqlEditorUrl } from '@/lib/postgres-url';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(['admin'], request);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* empty body ok */
  }

  const questionsPerTopic = Math.min(
    200,
    Math.max(10, Number(body.questionsPerTopic) || 150),
  );

  try {
    const result = await seedCuratedQuestionBank(admin, {
      questionsPerTopic,
      replaceExisting: body.replaceExisting !== false,
    });

    return NextResponse.json({
      ok: true,
      message: `Loaded ${result.questionsInserted} topic-wise MCQs across ${result.tagsEnsured} syllabus tags. Use Draw from bank.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not seed question bank';
    return NextResponse.json(
      {
        error: message,
        sqlEditorUrl: supabaseSqlEditorUrl(),
        hint: message.includes('public.questions')
          ? 'Click Copy bootstrap SQL in the question bank panel, run it in Supabase SQL editor, wait 30s, retry.'
          : undefined,
      },
      { status: 400 },
    );
  }
}
