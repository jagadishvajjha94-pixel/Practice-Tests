import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resetElevateXSampleAttempts } from '@/lib/elevatex-sample-seed';
import { ELEVATEX_SAMPLE_COUNT } from '@/lib/elevatex-sample-credentials';

export const maxDuration = 60;

function getServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw || raw.includes('YOUR_')) return undefined;
  return raw;
}

/** Clears ElevateX attempts for EXS1001–EXS1042 so they can retake (logins unchanged). */
export async function POST() {
  try {
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

    const result = await resetElevateXSampleAttempts(supabase);

    if (result.errors.length > 0 && result.attemptsDeleted === 0 && result.studentsFound === 0) {
      return NextResponse.json({ error: result.errors.join('; '), ...result }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ElevateX attempts for ${result.studentsFound} demo student(s). They can log in with EXS1001–EXS1042 and take the exam again.`,
      expectedDemoCount: ELEVATEX_SAMPLE_COUNT,
      ...result,
      studentLogin: '/auth/login/student',
      assessment: '/placement/assessment',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ElevateX attempt reset failed';
    console.error('[reset-elevatex-attempts]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
