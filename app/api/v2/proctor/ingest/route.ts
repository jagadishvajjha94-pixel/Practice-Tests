import { NextResponse } from 'next/server';
import {
  ensureExamViolationsTableIfPossible,
  isExamViolationsSchemaError,
} from '@/lib/ensure-exam-violations';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

const PROCTOR_URL = (process.env.AI_PROCTOR_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '');
const PROCTOR_TOKEN = process.env.INTERNAL_API_TOKEN ?? 'dev-internal-token-change-me';

type IngestItem = {
  type: string;
  metadata?: Record<string, unknown>;
};

function normalizeStoredTestId(testId: string | undefined | null): string | null {
  const value = String(testId ?? '').trim();
  return value || null;
}

async function insertViolationRows(
  admin: NonNullable<ReturnType<typeof getServiceSupabase>>,
  rows: Array<{
    user_id: string;
    test_id: string | null;
    attempt_id: string | null;
    violation_type: string;
    metadata: Record<string, unknown>;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  let { error } = await admin.from('exam_violations').insert(rows);

  if (error && isExamViolationsSchemaError(error)) {
    const ensured = await ensureExamViolationsTableIfPossible();
    if (ensured) {
      ({ error } = await admin.from('exam_violations').insert(rows));
    }
  }

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function POST(request: Request) {
  const auth = await requireAuth(['student', 'admin']);
  if ('response' in auth) return auth.response;

  const body = (await request.json()) as {
    testId?: string;
    attemptId?: string;
    sessionId?: string;
    type?: string;
    metadata?: Record<string, unknown>;
    batch?: IngestItem[];
    linkAttempt?: boolean;
  };

  const admin = getServiceSupabase();
  const userId = auth.ctx.user.id;
  const sessionId = body.sessionId ?? body.attemptId ?? body.testId ?? null;

  if (body.linkAttempt && body.attemptId && sessionId && admin) {
    await admin
      .from('exam_violations')
      .update({ attempt_id: body.attemptId, test_id: body.testId ?? null })
      .eq('user_id', userId)
      .filter('metadata->>sessionId', 'eq', sessionId);
  }

  const items: IngestItem[] = body.batch?.length
    ? body.batch
    : body.type
      ? [{ type: body.type, metadata: body.metadata }]
      : [];

  if (!items.length && !body.linkAttempt) {
    return NextResponse.json({ error: 'type or batch required' }, { status: 400 });
  }

  let stored = 0;
  if (admin && items.length) {
    const testId = normalizeStoredTestId(body.testId);
    const attemptId = body.attemptId ? String(body.attemptId) : null;
    const rows = items.map((item) => ({
      user_id: userId,
      test_id: testId,
      attempt_id: attemptId,
      violation_type: item.type,
      metadata: {
        ...(item.metadata ?? {}),
        sessionId,
        testId: body.testId ?? testId,
      },
    }));
    const inserted = await insertViolationRows(admin, rows);
    if (!inserted.ok) {
      return NextResponse.json({ error: inserted.error ?? 'Insert failed', stored: 0 }, { status: 500 });
    }
    stored = rows.length;
  }

  if (items.length) {
    void Promise.allSettled(
      items.map((item) =>
        fetch(`${PROCTOR_URL}/v1/signals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': PROCTOR_TOKEN,
          },
          body: JSON.stringify({
            examSessionId: sessionId ?? 'unknown',
            userId,
            type: item.type,
            metadata: { ...(item.metadata ?? {}), testId: body.testId },
          }),
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true, stored: stored || items.length });
}
