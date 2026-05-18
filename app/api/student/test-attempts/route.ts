import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  ensureStudentUserRow,
  fetchAttemptsForUser,
  persistTestAttempt,
  type PersistAttemptInput,
} from '@/lib/test-attempts';

export async function GET() {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const attempts = await fetchAttemptsForUser(service, auth.ctx.user.id);
  return NextResponse.json({ attempts });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
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
    answers: (body.answers as Record<string, unknown>) ?? {},
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
    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save attempt';
    console.error('[test-attempts POST]', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
