import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { rollNumberFromUser } from '@/lib/admin/roll-number';
import { releaseStudentSession, sessionIdFromAccessToken } from '@/lib/student-session-lock';
import { getSupabaseServerClient } from '@/lib/supabase-server';

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

  const rollNumber = rollNumberFromUser(user?.email ?? auth.ctx.user.email ?? '', user?.user_metadata);
  const sessionId = session?.access_token
    ? sessionIdFromAccessToken(session.access_token)
    : null;

  if (rollNumber && rollNumber !== '—') {
    await releaseStudentSession(admin, rollNumber, sessionId);
  }

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
