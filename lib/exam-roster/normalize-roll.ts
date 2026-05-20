import { COLLEGE } from '@/lib/college-brand';
import { studentAuthEmail } from '@/lib/college-auth';

/** Normalize roll / registration number for matching. */
export function normalizeRollNumber(roll: string): string {
  const v = roll.trim().toUpperCase().replace(/\s+/g, '');
  if (!v) return '';
  const withoutDomain = v.replace(/@.+$/, '');
  return withoutDomain;
}

export function rollFromAuthUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  const saved = (meta.prep_profile ?? {}) as Record<string, unknown>;
  const fromMeta =
    (saved.roll_number as string | undefined) ??
    (meta.roll_number as string | undefined) ??
    (meta.rollNumber as string | undefined);
  if (fromMeta?.trim()) return normalizeRollNumber(fromMeta);

  const email = String(user.email ?? '').trim().toLowerCase();
  if (!email) return '';
  const local = email.split('@')[0] ?? '';
  if (email.includes(`@student.${COLLEGE.emailDomain}`)) {
    return normalizeRollNumber(local);
  }
  return normalizeRollNumber(local);
}

export function rosterEmailForRoll(roll: string): string {
  return studentAuthEmail(normalizeRollNumber(roll));
}
