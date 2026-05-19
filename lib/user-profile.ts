import type { SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';
import { formatSupabaseError } from '@/lib/utils';

export const RESUME_MAX_CHARS = 12_000;

export type ProfileSource = 'public.users' | 'user_metadata';

export type ProfileApiResponse = {
  profile: UserProfile | null;
  source: ProfileSource | null;
  tableMissing: boolean;
  error: string | null;
};

export type ProfileSaveResponse = {
  ok: boolean;
  source: ProfileSource | null;
  tableMissing: boolean;
  error: string | null;
  note: string | null;
};

async function authHeader(supabase: SupabaseClient | null): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Load the signed-in student's profile via the server (service-role + metadata fallback). */
export async function fetchProfileViaApi(
  supabase: SupabaseClient | null,
): Promise<ProfileApiResponse> {
  try {
    const headers = await authHeader(supabase);
    const res = await fetch('/api/student/profile', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as {
      profile?: UserProfile;
      source?: ProfileSource;
      tableMissing?: boolean;
      error?: string;
    };
    if (!res.ok) {
      return {
        profile: null,
        source: null,
        tableMissing: false,
        error: body.error ?? `Profile request failed (${res.status})`,
      };
    }
    return {
      profile: body.profile ?? null,
      source: body.source ?? null,
      tableMissing: !!body.tableMissing,
      error: null,
    };
  } catch (error) {
    return {
      profile: null,
      source: null,
      tableMissing: false,
      error: formatSupabaseError(error),
    };
  }
}

/** Save the signed-in student's profile via the server. */
export async function saveProfileViaApi(
  supabase: SupabaseClient | null,
  fields: {
    full_name?: string | null;
    phone?: string | null;
    college?: string | null;
    branch?: string | null;
    cgpa?: number | null;
    resume_text?: string | null;
    resume_file_name?: string | null;
    resume_storage_path?: string | null;
    resume_updated_at?: string | null;
  },
): Promise<ProfileSaveResponse> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await authHeader(supabase)),
    };
    const res = await fetch('/api/student/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify(fields),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      source?: ProfileSource;
      tableMissing?: boolean;
      error?: string;
      note?: string;
    };
    return {
      ok: !!body.ok && res.ok,
      source: body.source ?? null,
      tableMissing: !!body.tableMissing,
      error: body.error ?? (res.ok ? null : `Save failed (${res.status})`),
      note: body.note ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      source: null,
      tableMissing: false,
      error: formatSupabaseError(error),
      note: null,
    };
  }
}

export type ResumeUploadResponse = {
  ok: boolean;
  storagePath: string | null;
  fileName: string | null;
  error: string | null;
  hint: string | null;
};

/** Upload a resume file via the server (bucket auto-created with service role). */
export async function uploadResumeViaApi(
  supabase: SupabaseClient | null,
  file: File,
): Promise<ResumeUploadResponse> {
  try {
    const form = new FormData();
    form.append('file', file);
    const headers = await authHeader(supabase);
    const res = await fetch('/api/student/profile/upload-resume', {
      method: 'POST',
      headers,
      body: form,
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      storagePath?: string;
      fileName?: string;
      error?: string;
      hint?: string;
    };
    return {
      ok: !!body.ok && res.ok,
      storagePath: body.storagePath ?? null,
      fileName: body.fileName ?? null,
      error: body.error ?? (res.ok ? null : `Upload failed (${res.status})`),
      hint: body.hint ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      storagePath: null,
      fileName: null,
      error: formatSupabaseError(error),
      hint: null,
    };
  }
}

export function isUsersTableMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; status?: number; statusCode?: number };
  const message = String(e.message ?? '').toLowerCase();
  const status = e.status ?? e.statusCode;
  if (status === 404 && message.includes('users')) return true;
  if (e.code === 'PGRST205' || e.code === '42P01') return true;
  return (
    message.includes('users') &&
    (message.includes('could not find') ||
      message.includes('schema cache') ||
      message.includes('does not exist') ||
      message.includes('not found'))
  );
}

/** Create `public.users` via server route (needs POSTGRES_URL in .env.local). */
export async function setupUsersTableViaApi(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/setup/ensure-users', { method: 'POST' });
    const body = (await res.json()) as { success?: boolean; message?: string; error?: string; hint?: string };
    if (!res.ok) {
      return {
        ok: false,
        message: body.hint ? `${body.error ?? 'Setup failed'}. ${body.hint}` : (body.error ?? 'Setup failed'),
      };
    }
    return { ok: true, message: body.message ?? 'Profile database is ready.' };
  } catch {
    return {
      ok: false,
      message:
        'Could not run setup. Run supabase/migrations/001_users_resume.sql in Supabase → SQL Editor.',
    };
  }
}

export async function upsertUserProfileFields(
  supabase: SupabaseClient,
  authUser: AuthUser,
  fields: {
    full_name?: string;
    phone?: string | null;
    college?: string | null;
    branch?: string | null;
    resume_text?: string | null;
    resume_file_name?: string | null;
    resume_storage_path?: string | null;
    resume_updated_at?: string | null;
  },
): Promise<{ ok: boolean; error: string | null; tableMissing: boolean }> {
  const resume_text =
    fields.resume_text !== undefined
      ? fields.resume_text?.trim().slice(0, RESUME_MAX_CHARS) || null
      : undefined;

  const payload: Record<string, unknown> = {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name:
      fields.full_name ?? (authUser.user_metadata?.full_name as string | undefined) ?? '',
    subscription_status: 'free',
    updated_at: new Date().toISOString(),
  };

  if (fields.phone !== undefined) payload.phone = fields.phone;
  if (fields.college !== undefined) payload.college = fields.college;
  if (fields.branch !== undefined) payload.branch = fields.branch;
  if (resume_text !== undefined) {
    payload.resume_text = resume_text;
    payload.resume_updated_at = fields.resume_updated_at ?? (resume_text ? new Date().toISOString() : null);
  }
  if (fields.resume_file_name !== undefined) payload.resume_file_name = fields.resume_file_name;
  if (fields.resume_storage_path !== undefined) payload.resume_storage_path = fields.resume_storage_path;

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });

  if (!error) return { ok: true, error: null, tableMissing: false };
  if (isUsersTableMissingError(error)) {
    return { ok: false, error: formatSupabaseError(error), tableMissing: true };
  }
  return { ok: false, error: formatSupabaseError(error), tableMissing: false };
}

/** Ensure a row in public.users for the signed-in student (insert on first visit). */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  authUser: AuthUser,
): Promise<{ profile: UserProfile | null; error: string | null; tableMissing: boolean }> {
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!fetchError && existing) {
    return { profile: existing as UserProfile, error: null, tableMissing: false };
  }

  if (fetchError && isUsersTableMissingError(fetchError)) {
    return { profile: null, error: formatSupabaseError(fetchError), tableMissing: true };
  }

  if (fetchError && isUsersTableMissingError(fetchError)) {
    return { profile: null, error: formatSupabaseError(fetchError), tableMissing: true };
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    return { profile: null, error: formatSupabaseError(fetchError), tableMissing: false };
  }

  const payload = {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: (authUser.user_metadata?.full_name as string | undefined) ?? '',
    phone: null,
    subscription_status: 'free' as const,
    resume_text: null,
    resume_file_name: null,
    resume_storage_path: null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert([payload])
    .select('*')
    .single();

  if (insertError) {
    if (isUsersTableMissingError(insertError)) {
      return { profile: null, error: formatSupabaseError(insertError), tableMissing: true };
    }
    return { profile: null, error: formatSupabaseError(insertError), tableMissing: false };
  }

  return { profile: inserted as UserProfile, error: null, tableMissing: false };
}

export function resumeSnippet(text: string | null | undefined, max = 400): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export interface InterviewQuestionTemplate {
  question: string;
  expectedKeywords: string[];
  feedback: string;
}

export function buildInterviewPlanFromResume(
  resumeText: string | null | undefined,
  fallback: InterviewQuestionTemplate[],
): InterviewQuestionTemplate[] {
  const snippet = resumeSnippet(resumeText, 350);
  if (!snippet) return fallback;

  const lower = snippet.toLowerCase();
  const skillHint =
    /\b(java|python|react|node|sql|aws|data|ml|ai)\b/i.exec(snippet)?.[0] ?? 'your technical skills';

  return [
    {
      question: `I have reviewed your resume. Please introduce yourself and expand on this highlight: "${snippet.slice(0, 140)}${snippet.length > 140 ? '…' : ''}"`,
      expectedKeywords: ['experience', 'education', 'project', 'skills'],
      feedback: 'Strong start when you connect your resume facts to the role with clear examples.',
    },
    {
      question: `Your resume mentions relevant experience. Describe a project or achievement that demonstrates ${skillHint}.`,
      expectedKeywords: ['project', 'problem', 'solution', 'result'],
      feedback: 'Use STAR format: Situation, Task, Action, Result with numbers where possible.',
    },
    {
      question: 'What is your greatest strength for a campus placement role, and how does your resume support it?',
      expectedKeywords: ['strengths', 'skills', 'relevant', 'example'],
      feedback: 'Tie one strength to a concrete bullet from your resume.',
    },
    {
      question: lower.includes('intern') || lower.includes('project')
        ? 'Walk me through one internship or academic project from your resume — your role and outcome.'
        : 'Describe a challenging situation you handled and what you learned.',
      expectedKeywords: ['challenge', 'learning', 'team', 'outcome'],
      feedback: 'Interviewers look for ownership and measurable impact.',
    },
    {
      question: 'Where do you see yourself in three to five years, building on the path shown in your resume?',
      expectedKeywords: ['growth', 'goals', 'learning', 'career'],
      feedback: 'Align ambition with learning and contribution, not vague promises.',
    },
  ];
}
