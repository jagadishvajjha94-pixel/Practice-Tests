import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ELEVATEX_SAMPLE_PASSWORD } from '@/lib/elevatex-sample-credentials';
import { writeElevateXCredentialsPublicCsv } from '@/lib/elevatex-credentials-export';
import { seedElevateXSample } from '@/lib/elevatex-sample-seed';
import path from 'node:path';

function getServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw || raw.includes('YOUR_')) return undefined;
  return raw;
}

/**
 * Creates 42 ElevateX Slot 1 test students (EXS1001–EXS1042), removes legacy EX26001–15,
 * and go-lives ElevateX for 10:00 AM IST today on this Supabase project.
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

  writeElevateXCredentialsPublicCsv(path.join(process.cwd()), password);

  return NextResponse.json({
    success: true,
    message:
      'ElevateX Slot 1 test students are ready (EXS1001–EXS1042). Legacy EX26001–15 removed.',
    password: result.password,
    supabaseProject: result.supabaseProject,
    scheduleId: result.scheduleId,
    scheduleWarning: result.scheduleWarning,
    scheduleLabel: result.scheduleLabel,
    legacyRemoved: result.legacyRemoved,
    accounts: result.accounts,
    studentLogin: '/auth/login/student',
    credentialsCsv: '/elevatex-slot1-credentials.csv',
  });
}
