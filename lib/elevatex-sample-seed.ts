import type { SupabaseClient } from '@supabase/supabase-js';
import { COLLEGE } from '@/lib/college-brand';
import { studentAuthEmail } from '@/lib/college-auth';
import { ELEVATEX_MODULE_KEY } from '@/lib/elevatex';
import {
  ELEVATEX_SAMPLE_PASSWORD,
  ELEVATEX_SAMPLE_STUDENTS,
  type ElevateXSampleStudent,
} from '@/lib/elevatex-sample-credentials';

async function upsertAuthStudent(
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

async function upsertStudentProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  student: ElevateXSampleStudent,
): Promise<string | null> {
  const { error } = await supabase.from('users').upsert(
    {
      id: userId,
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
  return error?.message ?? null;
}

export type ElevateXSeedAccountResult = {
  roll: string;
  email: string;
  department: string;
  year: string;
  status: 'created' | 'updated';
  profileWarning?: string;
};

export type ElevateXSeedResult = {
  supabaseProject: string;
  password: string;
  accounts: ElevateXSeedAccountResult[];
  scheduleId: string | null;
  scheduleWarning: string | null;
};

/** Create/update all ElevateX sample auth users on the configured Supabase project. */
export async function seedElevateXSample(
  supabase: SupabaseClient,
  supabaseUrl: string,
  password: string = ELEVATEX_SAMPLE_PASSWORD,
): Promise<ElevateXSeedResult | { error: string; partial?: ElevateXSeedAccountResult[] }> {
  const project = (() => {
    try {
      return new URL(supabaseUrl).hostname.split('.')[0] ?? supabaseUrl;
    } catch {
      return supabaseUrl;
    }
  })();

  const accounts: ElevateXSeedAccountResult[] = [];

  for (const student of ELEVATEX_SAMPLE_STUDENTS) {
    const email = studentAuthEmail(student.roll);
    const metadata = {
      role: 'student',
      full_name: student.fullName,
      roll_number: student.roll,
      roll: student.roll,
      department: student.department,
      branch: student.department,
      year: student.year,
      academic_year: student.year,
    };

    const outcome = await upsertAuthStudent(supabase, email, password, metadata);
    if ('error' in outcome) {
      return { error: outcome.error, partial: accounts };
    }

    const profileWarning = await upsertStudentProfile(supabase, outcome.id, email, student);

    accounts.push({
      roll: student.roll,
      email,
      department: student.department,
      year: student.year,
      status: outcome.created ? 'created' : 'updated',
      ...(profileWarning ? { profileWarning } : {}),
    });
  }

  let scheduleId: string | null = null;
  let scheduleWarning: string | null = null;
  const endsAt = new Date('2026-06-30T18:30:00+05:30').toISOString();

  const { data: liveRows } = await supabase
    .from('evalora_module_schedules')
    .select('id')
    .eq('module_key', ELEVATEX_MODULE_KEY)
    .eq('status', 'live');

  if (liveRows?.length) {
    await supabase
      .from('evalora_module_schedules')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .in(
        'id',
        liveRows.map((r) => r.id),
      );
  }

  const { data: schedule, error: schedErr } = await supabase
    .from('evalora_module_schedules')
    .insert({
      module_key: ELEVATEX_MODULE_KEY,
      title: 'ElevateX — Sample Test (May 2026)',
      notice:
        'Sample ElevateX paper: Technical 20, Aptitude 20, Logic 15, IQ 15, Psychometric 15, Speaking 5 prompts. Use roll EX26001–EX26015.',
      status: 'live',
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
      target_departments: [],
      target_years: ['III Year'],
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (schedErr) {
    scheduleWarning = schedErr.message;
  } else {
    scheduleId = schedule?.id ?? null;
  }

  return {
    supabaseProject: project,
    password,
    accounts,
    scheduleId,
    scheduleWarning,
  };
}
