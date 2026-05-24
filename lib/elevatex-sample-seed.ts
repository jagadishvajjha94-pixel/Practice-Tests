import type { SupabaseClient } from '@supabase/supabase-js';
import { COLLEGE } from '@/lib/college-brand';
import { studentAuthEmail } from '@/lib/college-auth';
import { ELEVATEX_MODULE_KEY } from '@/lib/elevatex';
import {
  ELEVATEX_SAMPLE_PASSWORD,
  ELEVATEX_SAMPLE_SLOT,
  ELEVATEX_SAMPLE_STUDENTS,
  LEGACY_ELEVATEX_SAMPLE_ROLLS,
  type ElevateXSampleStudent,
} from '@/lib/elevatex-sample-credentials';

/** Slot 1 window: 10:00–12:00 IST on the given calendar day (YYYY-MM-DD). */
export function getElevateXSlot1ScheduleWindow(dateIso: string): {
  startsAt: string;
  endsAt: string;
  label: string;
} {
  const startsAt = new Date(`${dateIso}T10:00:00+05:30`).toISOString();
  const endsAt = new Date(`${dateIso}T12:00:00+05:30`).toISOString();
  return {
    startsAt,
    endsAt,
    label: `Slot ${ELEVATEX_SAMPLE_SLOT} · ${dateIso} · 10:00–12:00 IST`,
  };
}

function todayIsoInIst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

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

async function deleteLegacySampleStudents(
  supabase: SupabaseClient,
): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    errors.push(listError.message);
    return { deleted, errors };
  }

  for (const roll of LEGACY_ELEVATEX_SAMPLE_ROLLS) {
    const email = studentAuthEmail(roll);
    const user = listed.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (!user?.id) continue;

    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      errors.push(`${roll}: ${delErr.message}`);
      continue;
    }
    await supabase.from('users').delete().eq('id', user.id);
    deleted.push(roll);
  }

  return { deleted, errors };
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
  scheduleLabel: string;
  legacyRemoved: string[];
  legacyRemoveErrors: string[];
};

/** Create/update ElevateX test students; remove legacy EX26001–15; go live Slot 1 window. */
export async function seedElevateXSample(
  supabase: SupabaseClient,
  supabaseUrl: string,
  password: string = ELEVATEX_SAMPLE_PASSWORD,
  options?: { slotDateIso?: string },
): Promise<ElevateXSeedResult | { error: string; partial?: ElevateXSeedAccountResult[] }> {
  const project = (() => {
    try {
      return new URL(supabaseUrl).hostname.split('.')[0] ?? supabaseUrl;
    } catch {
      return supabaseUrl;
    }
  })();

  const { deleted: legacyRemoved, errors: legacyRemoveErrors } =
    await deleteLegacySampleStudents(supabase);

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

  const slotDate = options?.slotDateIso ?? todayIsoInIst();
  const { startsAt, endsAt, label: scheduleLabel } = getElevateXSlot1ScheduleWindow(slotDate);

  let scheduleId: string | null = null;
  let scheduleWarning: string | null = null;

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

  const rollRange = `${ELEVATEX_SAMPLE_STUDENTS[0]?.roll}–${ELEVATEX_SAMPLE_STUDENTS[ELEVATEX_SAMPLE_STUDENTS.length - 1]?.roll}`;

  const { data: schedule, error: schedErr } = await supabase
    .from('evalora_module_schedules')
    .insert({
      module_key: ELEVATEX_MODULE_KEY,
      title: `ElevateX — Slot ${ELEVATEX_SAMPLE_SLOT} test (${slotDate})`,
      notice: `Slot ${ELEVATEX_SAMPLE_SLOT} · 10:00 AM IST · ${rollRange} · 60 min paper.`,
      status: 'live',
      starts_at: startsAt,
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
    scheduleLabel,
    legacyRemoved,
    legacyRemoveErrors,
  };
}
