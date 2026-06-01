import type { UserProfile } from '@/lib/types';
import { formatDbError } from '@/lib/utils';
import { fetchWithSession } from '@/lib/client-auth';

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

/** Load the signed-in student's profile via the server API. */
export async function fetchProfileViaApi(): Promise<ProfileApiResponse> {
  try {
    const res = await fetchWithSession('/api/student/profile', { method: 'GET' });
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
      error: formatDbError(error),
    };
  }
}

/** Save the signed-in student's profile via the server API. */
export async function saveProfileViaApi(
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
    const res = await fetchWithSession('/api/student/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const body = (await res.json().catch(() => ({}))) as ProfileSaveResponse;
    if (!res.ok) {
      return {
        ok: false,
        source: null,
        tableMissing: !!body.tableMissing,
        error: body.error ?? `Save failed (${res.status})`,
        note: body.note ?? null,
      };
    }
    return body;
  } catch (error) {
    return {
      ok: false,
      source: null,
      tableMissing: false,
      error: formatDbError(error),
      note: null,
    };
  }
}

/** Upload resume file via server API. */
export async function uploadResumeViaApi(
  file: File,
): Promise<{
  ok: boolean;
  error: string | null;
  resume_text?: string;
  fileName?: string;
  storagePath?: string;
}> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetchWithSession('/api/student/profile/upload-resume', {
      method: 'POST',
      body: form,
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      resume_text?: string;
      fileName?: string;
      storagePath?: string;
    };
    if (!res.ok) {
      return { ok: false, error: body.error ?? `Upload failed (${res.status})` };
    }
    return {
      ok: true,
      error: null,
      resume_text: body.resume_text,
      fileName: body.fileName,
      storagePath: body.storagePath,
    };
  } catch (error) {
    return { ok: false, error: formatDbError(error) };
  }
}

/** Trigger RDS schema ensure via setup API. */
export async function setupUsersTableViaApi(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetchWithSession('/api/setup/rds', { method: 'POST' });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
    if (!res.ok) {
      return { ok: false, message: body.error ?? body.message ?? `Setup failed (${res.status})` };
    }
    return { ok: true, message: body.message ?? 'Database schema is ready.' };
  } catch (error) {
    return { ok: false, message: formatDbError(error) };
  }
}
