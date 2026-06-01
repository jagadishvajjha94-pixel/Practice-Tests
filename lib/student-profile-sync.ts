import type { DbServiceClient } from '@/lib/db/get-db-service';
import { COLLEGE } from '@/lib/college-brand';

export type StudentProfileFields = {
  branch: string | null;
  academic_year: string | null;
  full_name: string | null;
  email: string | null;
};

export function studentFieldsFromMetadata(
  meta: Record<string, unknown>,
  email?: string | null,
): StudentProfileFields {
  const saved = (meta.prep_profile ?? {}) as Record<string, unknown>;
  return {
    branch:
      (saved.branch as string | undefined) ??
      (meta.department as string | undefined) ??
      (meta.branch as string | undefined) ??
      null,
    academic_year:
      (saved.academic_year as string | undefined) ??
      (meta.year as string | undefined) ??
      (meta.academic_year as string | undefined) ??
      null,
    full_name:
      (saved.full_name as string | undefined) ??
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      null,
    email: email ?? null,
  };
}

/** Upsert public.users for a student (service role). Safe to call repeatedly. */
export async function ensureStudentProfileRow(
  admin: DbServiceClient,
  userId: string,
  fields: StudentProfileFields,
): Promise<StudentProfileFields> {
  const email = fields.email?.trim();
  if (!email) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    fields.email = authUser?.user?.email ?? null;
  }

  const payload: Record<string, unknown> = {
    id: userId,
    email: fields.email ?? `student-${userId}@local.invalid`,
    full_name: fields.full_name,
    branch: fields.branch,
    academic_year: fields.academic_year,
    user_role: 'student',
    college: COLLEGE.shortName,
    subscription_status: 'free',
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from('users').upsert(payload, { onConflict: 'id' });
  if (error && !error.message.includes('users')) {
    console.warn('ensureStudentProfileRow:', error.message);
  }

  return fields;
}

/** Prefer public.users row; fall back to auth metadata; optionally backfill users table. */
export async function resolveStudentTargeting(
  admin: DbServiceClient,
  userId: string,
  authMeta?: Record<string, unknown>,
  email?: string | null,
): Promise<StudentProfileFields> {
  const { data: row } = await admin
    .from('users')
    .select('branch, academic_year, full_name, email')
    .eq('id', userId)
    .maybeSingle();

  const fromMeta = studentFieldsFromMetadata(authMeta ?? {}, email);
  const merged: StudentProfileFields = {
    branch: (row?.branch as string | null) ?? fromMeta.branch,
    academic_year: (row?.academic_year as string | null) ?? fromMeta.academic_year,
    full_name: (row?.full_name as string | null) ?? fromMeta.full_name,
    email: (row?.email as string | null) ?? fromMeta.email ?? email ?? null,
  };

  if ((!row?.branch || !row?.academic_year) && (fromMeta.branch || fromMeta.academic_year)) {
    await ensureStudentProfileRow(admin, userId, merged);
  }

  return merged;
}
