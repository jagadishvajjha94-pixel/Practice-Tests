/**
 * Resume file upload for the student profile.
 *
 * Authenticated student sends a multipart form with the file field. We use the
 * service role to:
 *   1. Ensure the `student-resumes` storage bucket exists.
 *   2. Upload the file under `<userId>/resume-<ts>.<ext>`.
 *   3. Return the storage path so the client can persist it via the profile API.
 *
 * If text content is provided, we also return it so the caller can persist
 * `resume_text` in one round-trip.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/admin-access';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const BUCKET = 'student-resumes';

async function resolveAuthUser(
  request: NextRequest,
): Promise<{ user: AuthUser | null; admin: SupabaseClient | null }> {
  const admin = getAdminSupabase();
  const bearer = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim();

  if (bearer && admin) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user) return { user: data.user, admin };
  }

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) return { user: data.user, admin };
  }

  return { user: null, admin };
}

async function ensureResumesBucket(admin: SupabaseClient): Promise<void> {
  try {
    const { data } = await admin.storage.getBucket(BUCKET);
    if (data) return;
  } catch {
    /* bucket missing — fall through */
  }
  try {
    await admin.storage.createBucket(BUCKET, { public: false });
  } catch {
    /* may already exist due to race; ignore */
  }
}

export async function POST(request: NextRequest) {
  const { user, admin } = await resolveAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!admin) {
    return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  await ensureResumesBucket(admin);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = safeName.split('.').pop()?.toLowerCase() ?? 'dat';
  const path = `${user.id}/resume-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(arrayBuffer), {
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        ok: false,
        error: uploadError.message,
        hint:
          'Resume file could not be uploaded but text was preserved. Ensure the student-resumes bucket is enabled.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    storagePath: path,
    fileName: file.name,
  });
}
