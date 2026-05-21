import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  isElevateXAttemptMeta,
  parseElevateXScorecardFromAnswers,
} from '@/lib/placement/scorecard-payload';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const { attemptId } = await params;
  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { data: row, error } = await service
    .from('test_attempts')
    .select('id, user_id, test_id, test_title, answers')
    .eq('id', attemptId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  const testTitle = String(row.test_title ?? '');
  const testId = String(row.test_id ?? '');
  if (!isElevateXAttemptMeta(testId, testTitle)) {
    return NextResponse.json({ error: 'Not an ElevateX attempt' }, { status: 400 });
  }

  const scorecard = parseElevateXScorecardFromAnswers(row.answers);
  if (!scorecard) {
    return NextResponse.json(
      {
        error:
          'ElevateX scorecard is not available for this attempt. The student may have completed the exam before scorecard storage was enabled.',
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    scorecard,
    attemptId: String(row.id),
    userId: String(row.user_id),
  });
}
