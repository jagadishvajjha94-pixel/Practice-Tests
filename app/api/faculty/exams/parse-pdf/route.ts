import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/admin-access';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { parseExamTextFromDocument } from '@/lib/faculty/parse-exam-text';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;

async function resolveFacultyUser(request: NextRequest) {
  const admin = getAdminSupabase();
  const bearer = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim();

  if (bearer && admin) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user) return data.user;
  }

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) return data.user;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const user = await resolveFacultyUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const role = String(user.user_metadata?.role ?? '');
  if (role !== 'faculty') {
    return NextResponse.json({ error: 'Faculty access required' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Please upload a PDF question paper' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'PDF must be under 8 MB' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import('pdf-parse')).default as (
      data: Buffer,
    ) => Promise<{ text: string }>;
    const { text } = await pdfParse(buffer);
    const result = parseExamTextFromDocument(text);

    return NextResponse.json({
      questions: result.questions,
      count: result.questions.length,
      warnings: result.warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not read PDF. Ensure it is a text-based question paper.',
      },
      { status: 500 },
    );
  }
}
