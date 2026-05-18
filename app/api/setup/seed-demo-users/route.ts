import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { COLLEGE } from '@/lib/college-brand';
import { facultyAuthEmail, studentAuthEmail } from '@/lib/college-auth';
import {
  DEMO_FACULTY_ACCOUNT,
  DEMO_STUDENT_ACCOUNTS,
} from '@/lib/demo-credentials';

function getServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw || raw.includes('YOUR_')) return undefined;
  return raw;
}

async function upsertAuthUser(
  supabase: SupabaseClient,
  email: string,
  password: string,
  metadata: Record<string, string>,
): Promise<{ id: string; created: boolean } | { error: string }> {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) return { error: listError.message };

  const existing = listed.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());

  if (existing?.id) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (updateError) return { error: updateError.message };
    return { id: existing.id, created: false };
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (createError || !created.user?.id) {
    return { error: createError?.message ?? 'Failed to create user' };
  }
  return { id: created.user.id, created: true };
}

/** Creates demo student/faculty logins for UAT (not admin). */
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey || !supabaseUrl.includes('.supabase.co')) {
    return NextResponse.json(
      {
        error: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
      },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Array<{
    role: string;
    identifier: string;
    email: string;
    password: string;
    status: string;
  }> = [];

  for (const student of DEMO_STUDENT_ACCOUNTS) {
    const email = studentAuthEmail(student.rollNumber);
    const metadata = {
      role: 'student',
      full_name: student.fullName,
      roll_number: student.rollNumber,
      department: student.department,
      year: student.year,
    };
    const outcome = await upsertAuthUser(supabase, email, student.password, metadata);
    if ('error' in outcome) {
      return NextResponse.json({ error: outcome.error, partial: results }, { status: 500 });
    }

    await supabase.from('users').upsert(
      {
        id: outcome.id,
        email,
        full_name: student.fullName,
        branch: student.department,
        academic_year: student.year,
        user_role: 'student',
        college: COLLEGE.shortName,
        subscription_status: 'free',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    results.push({
      role: 'student',
      identifier: student.rollNumber,
      email,
      password: student.password,
      status: outcome.created ? 'created' : 'updated',
    });
  }

  const facultyEmail = facultyAuthEmail(DEMO_FACULTY_ACCOUNT.employeeId);
  const facultyMeta = {
    role: 'faculty',
    full_name: DEMO_FACULTY_ACCOUNT.fullName,
    employee_id: DEMO_FACULTY_ACCOUNT.employeeId,
    department: DEMO_FACULTY_ACCOUNT.department,
  };
  const facultyOutcome = await upsertAuthUser(
    supabase,
    facultyEmail,
    DEMO_FACULTY_ACCOUNT.password,
    facultyMeta,
  );
  if ('error' in facultyOutcome) {
    return NextResponse.json({ error: facultyOutcome.error, partial: results }, { status: 500 });
  }

  await supabase.from('faculty_profiles').upsert(
    {
      user_id: facultyOutcome.id,
      employee_id: DEMO_FACULTY_ACCOUNT.employeeId,
      department: DEMO_FACULTY_ACCOUNT.department,
      full_name: DEMO_FACULTY_ACCOUNT.fullName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  results.push({
    role: 'faculty',
    identifier: DEMO_FACULTY_ACCOUNT.employeeId,
    email: facultyEmail,
    password: DEMO_FACULTY_ACCOUNT.password,
    status: facultyOutcome.created ? 'created' : 'updated',
  });

  return NextResponse.json({
    success: true,
    message: 'Demo accounts are ready. Use roll number / employee ID on the login screens.',
    accounts: results,
    studentLogin: '/auth/login/student',
    facultyLogin: '/auth/login/faculty',
  });
}
