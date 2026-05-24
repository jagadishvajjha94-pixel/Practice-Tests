import type { SupabaseClient } from '@supabase/supabase-js';

/** No heartbeat for this long → session lock is released automatically. */
export const STUDENT_SESSION_STALE_MS = 45 * 60 * 1000;

export type StudentSessionRow = {
  roll_number: string;
  user_id: string;
  session_id: string;
  last_seen_at: string;
  created_at: string;
};

export function normalizeStudentRoll(rollOrEmail: string): string {
  const v = rollOrEmail.trim();
  if (!v) return '';
  const local = v.includes('@') ? v.split('@')[0] ?? v : v;
  return local.replace(/\s+/g, '').toUpperCase();
}

export function sessionIdFromAccessToken(accessToken: string): string | null {
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(
      Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as { session_id?: string; sub?: string };
    if (payload.session_id) return String(payload.session_id);
    return accessToken.slice(0, 48);
  } catch {
    return accessToken.slice(0, 48);
  }
}

function staleCutoffIso(now = Date.now()): string {
  return new Date(now - STUDENT_SESSION_STALE_MS).toISOString();
}

export async function purgeStaleStudentSessions(
  admin: SupabaseClient,
  now = Date.now(),
): Promise<void> {
  await admin
    .from('student_active_sessions')
    .delete()
    .lt('last_seen_at', staleCutoffIso(now));
}

export async function getActiveStudentSession(
  admin: SupabaseClient,
  rollNumber: string,
  now = Date.now(),
): Promise<StudentSessionRow | null> {
  const roll = normalizeStudentRoll(rollNumber);
  if (!roll) return null;

  await purgeStaleStudentSessions(admin, now);

  const { data } = await admin
    .from('student_active_sessions')
    .select('*')
    .eq('roll_number', roll)
    .maybeSingle();

  return (data as StudentSessionRow | null) ?? null;
}

export type ClaimStudentSessionResult =
  | { ok: true }
  | { ok: false; code: 'already_logged_in'; message: string };

export async function claimStudentSession(
  admin: SupabaseClient,
  rollNumber: string,
  userId: string,
  sessionId: string,
  now = Date.now(),
): Promise<ClaimStudentSessionResult> {
  const roll = normalizeStudentRoll(rollNumber);
  if (!roll || !userId || !sessionId) {
    return { ok: false, code: 'already_logged_in', message: 'Unable to start session.' };
  }

  await purgeStaleStudentSessions(admin, now);

  const existing = await getActiveStudentSession(admin, roll, now);

  if (existing && existing.session_id !== sessionId) {
    return {
      ok: false,
      code: 'already_logged_in',
      message:
        'This roll number is already logged in on another device or browser. Log out there first, or wait a few minutes and try again.',
    };
  }

  const nowIso = new Date(now).toISOString();
  const { error } = await admin.from('student_active_sessions').upsert(
    {
      roll_number: roll,
      user_id: userId,
      session_id: sessionId,
      last_seen_at: nowIso,
      created_at: existing?.created_at ?? nowIso,
    },
    { onConflict: 'roll_number' },
  );

  if (error) {
    return {
      ok: false,
      code: 'already_logged_in',
      message: 'Unable to register login session. Please try again.',
    };
  }

  return { ok: true };
}

export async function touchStudentSession(
  admin: SupabaseClient,
  rollNumber: string,
  sessionId: string,
): Promise<void> {
  const roll = normalizeStudentRoll(rollNumber);
  if (!roll || !sessionId) return;

  await admin
    .from('student_active_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('roll_number', roll)
    .eq('session_id', sessionId);
}

export async function releaseStudentSession(
  admin: SupabaseClient,
  rollNumber: string,
  sessionId?: string | null,
): Promise<void> {
  const roll = normalizeStudentRoll(rollNumber);
  if (!roll) return;

  let query = admin.from('student_active_sessions').delete().eq('roll_number', roll);
  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }
  await query;
}

export const STUDENT_ALREADY_LOGGED_IN_MESSAGE =
  'This roll number is already logged in on another device or browser. Log out there first, or wait a few minutes and try again.';
