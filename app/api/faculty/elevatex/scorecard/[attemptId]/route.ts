import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { departmentsMatch } from '@/lib/faculty/department-match';
import {
  isElevateXAttemptMeta,
  parseElevateXScorecardFromAnswers,
} from '@/lib/placement/scorecard-payload';
import { fetchTestAttemptById } from '@/lib/test-attempts';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const { attemptId } = await params;
  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { data: faculty } = await service
    .from('faculty_profiles')
    .select('department')
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle();

  const facultyDept = String(faculty?.department ?? '').trim();
  if (!facultyDept) {
    return NextResponse.json({ error: 'Faculty department not configured' }, { status: 403 });
  }

  const { row, error } = await fetchTestAttemptById(service, attemptId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  if (!isElevateXAttemptMeta(String(row.test_id ?? ''), String(row.test_title ?? ''))) {
    return NextResponse.json({ error: 'Not an ElevateX attempt' }, { status: 400 });
  }

  const { data: student } = await service
    .from('users')
    .select('branch')
    .eq('id', row.user_id)
    .maybeSingle();

  const studentBranch = String(student?.branch ?? '').trim();
  if (!departmentsMatch(studentBranch, facultyDept)) {
    return NextResponse.json({ error: 'Student is outside your department scope' }, { status: 403 });
  }

  const scorecard = parseElevateXScorecardFromAnswers(row.answers);
  if (!scorecard) {
    return NextResponse.json(
      { error: 'ElevateX scorecard is not stored for this attempt.' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    scorecard,
    attemptId: String(row.id),
    userId: String(row.user_id),
  });
}
