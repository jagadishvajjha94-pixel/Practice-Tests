import { NextResponse } from 'next/server';
import { loadQuestionsForTake, loadTestRowForTake } from '@/lib/load-test-for-take';
import { loadTestSections } from '@/lib/exam-v2/load-sections';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { findCompletedAttemptForTest } from '@/lib/test-attempts';
import { checkStudentExamAccess } from '@/lib/exam-access';
import { resolveStudentTargeting } from '@/lib/student-profile-sync';

type RouteContext = { params: Promise<{ testId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth(['student']);
  if ('response' in auth) return auth.response;

  const { testId } = await context.params;
  if (!testId?.trim()) {
    return NextResponse.json({ error: 'Test id required' }, { status: 400 });
  }

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const test = await loadTestRowForTake(admin, testId.trim());
  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(auth.ctx.resolved.id);
  const profile = await resolveStudentTargeting(
    admin,
    auth.ctx.resolved.id,
    (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>,
    auth.ctx.resolved.email ?? auth.ctx.user.email,
  );
  const access = await checkStudentExamAccess(admin, {
    testId: testId.trim(),
    department: profile.branch ?? auth.ctx.resolved.department ?? '',
    year: profile.academic_year ?? auth.ctx.resolved.academicYear ?? '',
  });

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: access.message,
        code: access.code,
        locked: true,
      },
      { status: 403 },
    );
  }

  const priorAttempt = await findCompletedAttemptForTest(admin, auth.ctx.user.id, testId.trim());

  const questions = await loadQuestionsForTake(admin, testId.trim());
  const sections = await loadTestSections(admin, testId.trim());

  if (!questions.length) {
    return NextResponse.json(
      {
        error: 'This test has no questions yet. Ask your faculty or admin to republish the exam.',
        test,
        questions: [],
        sections,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    test: { ...test, total_questions: questions.length },
    questions,
    sections,
    alreadySubmitted: Boolean(priorAttempt),
    priorAttempt,
  });
}
