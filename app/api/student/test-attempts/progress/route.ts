import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { ensureStudentUserRow, testIdsMatch } from '@/lib/test-attempts';

export const dynamic = 'force-dynamic';

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

  const testId = String(body.testId ?? '').trim();
  const scorePercent = Number(body.scorePercent);
  if (!testId || !Number.isFinite(scorePercent)) {
    return NextResponse.json({ error: 'testId and scorePercent are required' }, { status: 400 });
  }

  const userId = auth.ctx.user.id;
  await ensureStudentUserRow(service, {
    id: userId,
    email: auth.ctx.user.email,
  });

  const nowIso = new Date().toISOString();
  const testName = typeof body.testName === 'string' ? body.testName : 'Live exam';
  const elapsedSec = Number(body.elapsedSec) || 0;
  const answers =
    body.answers != null && typeof body.answers === 'object'
      ? (body.answers as Record<string, unknown>)
      : {};
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';

  const basePatch = {
    user_id: userId,
    test_id: testId,
    test_title: testName,
    percentage_score: scorePercent,
    score: scorePercent,
    status: 'in_progress' as const,
    answers,
    time_taken: elapsedSec,
    started_at: typeof body.startedAtIso === 'string' ? body.startedAtIso : nowIso,
    completed_at: null,
  };

  if (attemptId) {
    const { data: updated, error } = await service
      .from('test_attempts')
      .update(basePatch)
      .eq('id', attemptId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (!error && updated?.id) {
      return NextResponse.json({ id: String(updated.id) });
    }
  }

  const { data: existing } = await service
    .from('test_attempts')
    .select('id, test_id, status')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(20);

  const open = (existing ?? []).find((row) => testIdsMatch(row.test_id, testId));
  if (open?.id) {
    const { data: updated, error } = await service
      .from('test_attempts')
      .update(basePatch)
      .eq('id', open.id)
      .select('id')
      .maybeSingle();
    if (!error && updated?.id) {
      return NextResponse.json({ id: String(updated.id) });
    }
  }

  const { data: inserted, error: insertErr } = await service
    .from('test_attempts')
    .insert({
      ...basePatch,
      created_at: nowIso,
    })
    .select('id')
    .single();

  if (insertErr) {
    const minimal = await service
      .from('test_attempts')
      .insert({
        user_id: userId,
        test_id: testId,
        score: scorePercent,
        status: 'in_progress',
      })
      .select('id')
      .single();
    if (minimal.error) {
      return NextResponse.json({ error: minimal.error.message }, { status: 500 });
    }
    return NextResponse.json({ id: String(minimal.data?.id) });
  }

  return NextResponse.json({ id: String(inserted?.id) });
}
