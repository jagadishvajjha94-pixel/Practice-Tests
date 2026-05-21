import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ELEVATEX_SAMPLE_PASSWORD } from '@/lib/elevatex-sample-credentials';
import { seedElevateXSample } from '@/lib/elevatex-sample-seed';

function getServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw || raw.includes('YOUR_')) return undefined;
  return raw;
}

/**
 * Creates ElevateX sample students (EX26001–EX26015) in the **same** Supabase project
 * as NEXT_PUBLIC_SUPABASE_URL (local .env.local or Vercel production).
 */
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey || !supabaseUrl.includes('.supabase.co')) {
    return NextResponse.json(
      {
        error:
          'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role) for this deployment.',
      },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password =
    process.env.ELEVATEX_SAMPLE_PASSWORD?.trim() || ELEVATEX_SAMPLE_PASSWORD;

  const result = await seedElevateXSample(supabase, supabaseUrl, password);

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error, partial: result.partial },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message:
      'ElevateX sample students are ready on this Supabase project. Sign in with roll EX26001 and the password below.',
    password: result.password,
    supabaseProject: result.supabaseProject,
    scheduleId: result.scheduleId,
    scheduleWarning: result.scheduleWarning,
    accounts: result.accounts,
    studentLogin: '/auth/login/student',
    credentialsDoc: '/docs/ELEVATEX_SAMPLE_CREDENTIALS.md',
  });
}
