import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { rollNumberFromUser } from '@/lib/admin/roll-number';
import { sessionIdFromAccessToken, touchStudentSession } from '@/lib/student-session-lock';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireAuth(['student']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  const supabase = await getSupabaseServerClient();
  if (!admin || !supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const {
    data: { session, user },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rollNumber = rollNumberFromUser(user?.email ?? auth.ctx.user.email ?? '', user?.user_metadata);
  const sessionId = sessionIdFromAccessToken(session.access_token);
  if (!rollNumber || rollNumber === '—' || !sessionId) {
    return NextResponse.json({ ok: true });
  }

  await touchStudentSession(admin, rollNumber, sessionId);

  return NextResponse.json({ ok: true });
}
