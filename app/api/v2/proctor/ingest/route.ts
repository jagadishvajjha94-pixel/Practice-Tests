import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const PROCTOR_URL = (process.env.AI_PROCTOR_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '');
const PROCTOR_TOKEN = process.env.INTERNAL_API_TOKEN ?? 'dev-internal-token-change-me';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    testId?: string;
    attemptId?: string;
    type?: string;
    score?: number;
    metadata?: Record<string, unknown>;
    examSessionId?: string;
    userId?: string;
  };

  if (!body.type) {
    return NextResponse.json({ error: 'type required' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  let userId = body.userId ?? null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? userId;

    await supabase.from('exam_violations').insert({
      user_id: userId,
      test_id: body.testId ?? null,
      attempt_id: body.attemptId ?? null,
      violation_type: body.type,
      metadata: body.metadata ?? null,
    });
  }

  const sessionId = body.examSessionId ?? body.attemptId ?? body.testId ?? 'unknown';
  try {
    await fetch(`${PROCTOR_URL}/v1/signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': PROCTOR_TOKEN,
      },
      body: JSON.stringify({
        examSessionId: sessionId,
        userId: userId ?? 'anonymous',
        type: body.type,
        score: body.score ?? null,
        metadata: body.metadata ?? {},
      }),
    });
  } catch {
    /* proctor service optional in dev */
  }

  return NextResponse.json({ ok: true });
}
