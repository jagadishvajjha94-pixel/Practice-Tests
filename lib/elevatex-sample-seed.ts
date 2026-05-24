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

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]!, index);
    }
  }

  const workers = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function upsertAuthStudent(
  supabase: SupabaseClient,
  email: string,
  password: string,
  metadata: Record<string, string>,
  usersByEmail: Map<string, { id: string }>,
): Promise<{ id: string; created: boolean } | { error: string }> {
  const existing = usersByEmail.get(email.toLowerCase());

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
  usersByEmail.set(email.toLowerCase(), { id: created.user.id });
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

async function loadAuthUsersByEmail(
  supabase: SupabaseClient,
): Promise<{ usersByEmail: Map<string, { id: string }> } | { error: string }> {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) return { error: listError.message };

  const usersByEmail = new Map<string, { id: string }>();
  for (const user of listed.users) {
    const email = (user.email ?? '').toLowerCase();
    if (email && user.id) usersByEmail.set(email, { id: user.id });
  }
  return { usersByEmail };
}

async function deleteLegacySampleStudents(
  usersByEmail: Map<string, { id: string }>,
  supabase: SupabaseClient,
): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];

  for (const roll of LEGACY_ELEVATEX_SAMPLE_ROLLS) {
    const email = studentAuthEmail(roll).toLowerCase();
    const user = usersByEmail.get(email);
    if (!user?.id) continue;

    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      errors.push(`${roll}: ${delErr.message}`);
      continue;
    }
    usersByEmail.delete(email);
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

  const loaded = await loadAuthUsersByEmail(supabase);
  if ('error' in loaded) {
    return { error: loaded.error };
  }

  const { usersByEmail } = loaded;

  const { deleted: legacyRemoved, errors: legacyRemoveErrors } =
    await deleteLegacySampleStudents(usersByEmail, supabase);

  const seedResults = await mapConcurrent(ELEVATEX_SAMPLE_STUDENTS, 6, async (student) => {
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

    const outcome = await upsertAuthStudent(supabase, email, password, metadata, usersByEmail);
    if ('error' in outcome) {
      return { error: outcome.error, roll: student.roll } as const;
    }

    const profileWarning = await upsertStudentProfile(supabase, outcome.id, email, student);

    return {
      roll: student.roll,
      email,
      department: student.department,
      year: student.year,
      status: outcome.created ? ('created' as const) : ('updated' as const),
      ...(profileWarning ? { profileWarning } : {}),
    };
  });

  const failed = seedResults.find((r): r is { error: string; roll: string } => 'error' in r);
  if (failed) {
    const partial = seedResults.filter((r): r is ElevateXSeedAccountResult => !('error' in r));
    return { error: `${failed.roll}: ${failed.error}`, partial };
  }

  const accounts = seedResults as ElevateXSeedAccountResult[];

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
