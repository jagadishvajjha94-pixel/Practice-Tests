import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { parseAdminExamType } from '@/lib/admin/exam-type';
import { loadTestReportsPayload } from '@/lib/admin/test-reports-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const examType = parseAdminExamType(searchParams.get('examType'));
  const testId = searchParams.get('testId')?.trim() || undefined;
  const scheduleId = searchParams.get('scheduleId')?.trim() || undefined;

  const payload = await loadTestReportsPayload(admin, examType, testId, scheduleId);

  return NextResponse.json(payload);
}
