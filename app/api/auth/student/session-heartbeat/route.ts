import { NextResponse } from 'next/server';
import { rollNumberFromUser } from '@/lib/admin/roll-number';
import { sessionIdFromAccessToken, touchStudentSession } from '@/lib/student-session-lock';
import { getServiceSupabase } from '@/lib/server-auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** Keep student session lock alive; no-op for guests and admins (avoids 401 noise in console). */
export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email?.includes('@student.')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const rollNumber = rollNumberFromUser(user.email ?? '', user.user_metadata);
  const sessionId = sessionIdFromAccessToken(session.access_token);
  if (!rollNumber || rollNumber === '—' || !sessionId) {
    return NextResponse.json({ ok: true });
  }

  await touchStudentSession(admin, rollNumber, sessionId);

  return NextResponse.json({ ok: true });
}
