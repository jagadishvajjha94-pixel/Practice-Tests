import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  ensureStudentUserRow,
  fetchAttemptsForUser,
  persistTestAttempt,
  fallbackTestForAttempt,
  normalizeAttemptRow,
  type PersistAttemptInput,
} from '@/lib/test-attempts';
import type { TestAttempt } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth(undefined, request);
  if ('response' in auth) return auth.response;

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const attempts = await fetchAttemptsForUser(service, auth.ctx.user.id);
  return NextResponse.json({ attempts });
}

export async function POST(request: Request) {
  const auth = await requireAuth(undefined, request);
  if ('response' in auth) return auth.response;

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const scorePercent = Number(body.scorePercent);
  if (!Number.isFinite(scorePercent)) {
    return NextResponse.json({ error: 'scorePercent is required' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const input: PersistAttemptInput = {
    userId: auth.ctx.user.id,
    testId: String(body.testId ?? ''),
    testName: typeof body.testName === 'string' ? body.testName : undefined,
    scorePercent,
    rawNetScore: Number(body.rawNetScore) || 0,
    answers: {},
    elapsedSec: Number(body.elapsedSec) || 0,
    startedAtIso: typeof body.startedAtIso === 'string' ? body.startedAtIso : nowIso,
    completedAtIso: typeof body.completedAtIso === 'string' ? body.completedAtIso : nowIso,
  };

  await ensureStudentUserRow(service, {
    id: auth.ctx.user.id,
    email: auth.ctx.user.email,
  });

  try {
    const { id } = await persistTestAttempt(service, input);
    const attempts = await fetchAttemptsForUser(service, auth.ctx.user.id);
    const saved = attempts.find((row) => String(row.id) === String(id));
    const attempt: TestAttempt & { test: { name: string } } = saved ?? {
      ...normalizeAttemptRow({
        id,
        user_id: auth.ctx.user.id,
        test_id: input.testId,
        score: input.scorePercent,
        percentage_score: input.scorePercent,
        status: 'completed',
        created_at: input.completedAtIso,
        completed_at: input.completedAtIso,
        started_at: input.startedAtIso,
        time_taken: input.elapsedSec,
      }),
      test: {
        ...fallbackTestForAttempt({
          id,
          user_id: auth.ctx.user.id,
          test_id: input.testId,
          started_at: input.startedAtIso,
          completed_at: input.completedAtIso,
          score: input.scorePercent,
          answers: null,
          time_taken: input.elapsedSec,
          status: 'completed',
          created_at: input.completedAtIso,
        }),
        name: input.testName ?? 'Practice test',
      },
    };
    return NextResponse.json({ id, attempt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save attempt';
    console.error('[test-attempts POST]', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
