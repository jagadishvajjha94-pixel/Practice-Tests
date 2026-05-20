import { NextResponse } from 'next/server';
import { loadQuestionsForTake, loadTestRowForTake } from '@/lib/load-test-for-take';
import { loadTestSections } from '@/lib/exam-v2/load-sections';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

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
  });
}
