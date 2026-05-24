import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { fetchElevateXScorecardForAttempt } from '@/lib/placement/fetch-elevatex-scorecard';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const auth = await requireAuth(undefined, _request);
  if ('response' in auth) return auth.response;

  const { attemptId } = await params;
  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const result = await fetchElevateXScorecardForAttempt(service, attemptId, {
    userId: auth.ctx.user.id,
  });

  if (!('scorecard' in result)) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.userId && result.userId !== auth.ctx.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ scorecard: result.scorecard, attemptId: result.attemptId });
}
