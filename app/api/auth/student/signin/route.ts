import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { studentAuthEmail } from '@/lib/college-auth';
import { getServiceSupabase } from '@/lib/server-auth';
import {
  claimStudentSession,
  sessionIdFromAccessToken,
  STUDENT_ALREADY_LOGGED_IN_MESSAGE,
} from '@/lib/student-session-lock';
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isSupabasePublicEnvConfigured,
  SUPABASE_PUBLIC_ENV_MESSAGE,
} from '@/lib/supabase-public-env';

export async function POST(request: NextRequest) {
  if (!isSupabasePublicEnvConfigured()) {
    return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MESSAGE }, { status: 500 });
  }

  let body: {
    rollNumber?: string;
    password?: string;
    department?: string;
    year?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rollNumber = body.rollNumber?.trim() ?? '';
  const password = body.password ?? '';
  const department = body.department?.trim() ?? '';
  const year = body.year?.trim() ?? '';

  if (!rollNumber || !password) {
    return NextResponse.json({ error: 'Roll number and password are required' }, { status: 400 });
  }

  const email = studentAuthEmail(rollNumber);
  const supabaseUrl = getPublicSupabaseUrl()!;
  const supabaseAnonKey = getPublicSupabaseAnonKey()!;

  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookieResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    return NextResponse.json(
      {
        error: /invalid login credentials/i.test(error?.message ?? '')
          ? 'Invalid roll number or password.'
          : (error?.message ?? 'Invalid roll number or password.'),
      },
      { status: 401 },
    );
  }

  const admin = getServiceSupabase();
  if (!admin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const sessionId = sessionIdFromAccessToken(data.session.access_token);
  if (!sessionId) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Unable to start session.' }, { status: 500 });
  }

  const claim = await claimStudentSession(admin, rollNumber, data.user.id, sessionId);
  if (!claim.ok) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: claim.message || STUDENT_ALREADY_LOGGED_IN_MESSAGE,
        code: 'already_logged_in',
      },
      { status: 409 },
    );
  }

  const metadata: Record<string, string> = {
    role: 'student',
    roll_number: rollNumber,
    full_name: rollNumber,
  };
  if (department) metadata.department = department;
  if (year) metadata.year = year;

  await supabase.auth.updateUser({ data: metadata });
  await admin
    .from('users')
    .upsert(
      {
        id: data.user.id,
        email: data.user.email ?? email,
        full_name: rollNumber,
        branch: department || undefined,
        academic_year: year || undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .then(() => undefined);

  const jsonResponse = NextResponse.json({
    success: true,
    email: data.user.email,
    userId: data.user.id,
  });

  cookieResponse.cookies.getAll().forEach((cookie) => {
    jsonResponse.cookies.set(cookie);
  });

  return jsonResponse;
}
