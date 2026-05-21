import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  ensureStudentUserRow,
  fetchAttemptsForUser,
  findCompletedAttemptForTest,
  findCompletedElevateXAttempt,
  persistTestAttempt,
  fallbackTestForAttempt,
  normalizeAttemptRow,
  type PersistAttemptInput,
} from '@/lib/test-attempts';
import {
  appendStudentDashboardStat,
  buildStatEntry,
  fetchStudentDashboardStats,
} from '@/lib/student-dashboard-stats';
import type { TestAttempt } from '@/lib/types';
import { assertStudentCanTakeTest } from '@/lib/exam-access';
import { isElevateXTestId } from '@/lib/elevatex';
import { resolveStudentTargeting } from '@/lib/student-profile-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth(undefined, request);
  if ('response' in auth) return auth.response;

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const userId = auth.ctx.user.id;

  let attempts = await fetchStudentDashboardStats(service, userId);
  if (!attempts.length) {
    attempts = await fetchAttemptsForUser(service, userId);
  }

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
  const userId = auth.ctx.user.id;
  const examKind = typeof body.examKind === 'string' ? body.examKind : '';
  let testName = typeof body.testName === 'string' ? body.testName : 'Practice test';
  if (examKind === 'programming' && !testName.toLowerCase().includes('programming')) {
    testName = `Programming · ${testName}`;
  } else if (examKind === 'department' && !testName.startsWith('Department')) {
    testName = `Department · ${testName}`;
  }

  const totalQuestions = Number(body.totalQuestions) || 0;
  const answersIn =
    body.answers != null && typeof body.answers === 'object'
      ? (body.answers as Record<string, unknown>)
      : {};

  const input: PersistAttemptInput = {
    userId,
    testId: String(body.testId ?? ''),
    testName,
    scorePercent,
    rawNetScore: Number(body.rawNetScore) || 0,
    answers: answersIn,
    elapsedSec: Number(body.elapsedSec) || 0,
    startedAtIso: typeof body.startedAtIso === 'string' ? body.startedAtIso : nowIso,
    completedAtIso: typeof body.completedAtIso === 'string' ? body.completedAtIso : nowIso,
    proctorSessionId:
      typeof body.proctorSessionId === 'string' ? body.proctorSessionId : undefined,
    proctorViolations: Number(body.proctorViolations) || 0,
    proctorAutoSubmit: Boolean(body.proctorAutoSubmit),
  };

  await ensureStudentUserRow(service, {
    id: userId,
    email: auth.ctx.user.email,
  });

  const testId = String(body.testId ?? '').trim();
  if (testId) {
    const { data: authUser } = await service.auth.admin.getUserById(userId);
    const profile = await resolveStudentTargeting(
      service,
      userId,
      (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>,
      authUser?.user?.email ?? auth.ctx.user.email,
    );
    const access = await assertStudentCanTakeTest(
      service,
      {
        id: userId,
        email: authUser?.user?.email ?? auth.ctx.user.email,
        user_metadata: (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>,
      },
      testId,
      profile,
    );
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.message, code: access.code, locked: true },
        { status: 403 },
      );
    }

    const prior = isElevateXTestId(testId)
      ? await findCompletedElevateXAttempt(service, userId)
      : await findCompletedAttemptForTest(service, userId, testId);
    if (prior) {
      return NextResponse.json(
        {
          error: isElevateXTestId(testId)
            ? 'You have already completed ElevateX. Each student may attempt it only once.'
            : 'You have already submitted this test and cannot take it again.',
          attemptId: prior.id,
          priorAttempt: prior,
        },
        { status: 409 },
      );
    }
  }

  const statEntry = buildStatEntry({
    id: `pending-${Date.now()}`,
    userId,
    testId: input.testId,
    testName: input.testName ?? 'Practice test',
    scorePercent,
    elapsedSec: input.elapsedSec,
    completedAtIso: input.completedAtIso,
    totalQuestions: totalQuestions || undefined,
  });

  try {
    const { id } = await persistTestAttempt(service, input);
    statEntry.id = id;

    if (input.proctorSessionId) {
      await service
        .from('exam_violations')
        .update({ attempt_id: id, test_id: input.testId || null })
        .eq('user_id', userId)
        .filter('metadata->>sessionId', 'eq', input.proctorSessionId);
    }

    await appendStudentDashboardStat(service, userId, statEntry);

    const attempts = await fetchStudentDashboardStats(service, userId);
    const saved = attempts.find((row) => String(row.id) === String(id));
    const attempt: TestAttempt & { test: { name: string } } = saved ?? {
      ...normalizeAttemptRow({
        id,
        user_id: userId,
        test_id: input.testId,
        score: input.scorePercent,
        percentage_score: input.scorePercent,
        status: 'completed',
        created_at: input.completedAtIso,
        completed_at: input.completedAtIso,
        started_at: input.startedAtIso,
        time_taken: input.elapsedSec,
        test_title: input.testName,
      }),
      test: {
        ...fallbackTestForAttempt({
          id,
          user_id: userId,
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

    return NextResponse.json({ id, attempt, attempts });
  } catch (error) {
    try {
      await appendStudentDashboardStat(service, userId, statEntry);
      const attempts = await fetchStudentDashboardStats(service, userId);
      return NextResponse.json({
        id: statEntry.id,
        attempt: {
          ...normalizeAttemptRow({
            id: statEntry.id,
            user_id: userId,
            test_id: statEntry.test_id,
            score: statEntry.score,
            status: 'completed',
            created_at: statEntry.created_at,
            completed_at: statEntry.completed_at,
            started_at: statEntry.created_at,
            time_taken: statEntry.time_taken,
          }),
          test: {
            ...fallbackTestForAttempt({
              id: statEntry.id,
              user_id: userId,
              test_id: statEntry.test_id,
              started_at: statEntry.created_at,
              completed_at: statEntry.completed_at,
              score: statEntry.score,
              answers: null,
              time_taken: statEntry.time_taken,
              status: 'completed',
              created_at: statEntry.created_at,
            }),
            name: statEntry.test_name,
          },
        },
        attempts,
        warning: 'Saved to dashboard stats; test_attempts row may be missing.',
      });
    } catch (statsError) {
      const message = error instanceof Error ? error.message : 'Failed to save attempt';
      console.error('[test-attempts POST]', message, error, statsError);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
