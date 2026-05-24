import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { departmentsMatch } from '@/lib/faculty/department-match';
import { fetchElevateXScorecardForAttempt } from '@/lib/placement/fetch-elevatex-scorecard';

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

  const result = await fetchElevateXScorecardForAttempt(service, attemptId);

  if (!('scorecard' in result)) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { data: student } = await service
    .from('users')
    .select('branch')
    .eq('id', result.userId)
    .maybeSingle();

  const studentBranch = String(student?.branch ?? '').trim();
  if (studentBranch && !departmentsMatch(studentBranch, facultyDept)) {
    return NextResponse.json({ error: 'Student is outside your department scope' }, { status: 403 });
  }

  return NextResponse.json({
    scorecard: result.scorecard,
    attemptId: result.attemptId,
    userId: result.userId,
  });
}
