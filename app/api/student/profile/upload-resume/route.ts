/**
 * Resume file upload for the student profile (AWS S3 via Prisma service client).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDbService } from '@/lib/db/get-db-service';
import type { DbServiceClient } from '@/lib/db/get-db-service';

export const runtime = 'nodejs';

const BUCKET = 'student-resumes';

async function resolveAuthUser(): Promise<{ userId: string | null; admin: DbServiceClient }> {
  const admin = getDbService();
  const session = await auth();
  return { userId: session?.user?.id ?? null, admin };
}

async function ensureResumesBucket(admin: DbServiceClient): Promise<void> {
  try {
    const { data } = await admin.storage.getBucket(BUCKET);
    if (data) return;
  } catch {
    /* bucket missing */
  }
  try {
    await admin.storage.createBucket(BUCKET, { public: false });
  } catch {
    /* may already exist */
  }
}

export async function POST(_request: NextRequest) {
  const { userId, admin } = await resolveAuthUser();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await _request.formData();
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
  const path = `${userId}/resume-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(arrayBuffer), {
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    storagePath: path,
    fileName: file.name,
  });
}
