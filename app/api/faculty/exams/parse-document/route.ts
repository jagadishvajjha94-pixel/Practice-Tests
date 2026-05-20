import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/admin-access';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  extractTextFromUpload,
  parseMcqCsv,
  parseMcqPlainText,
} from '@/lib/question-bank/parse-upload-content';
import { MCQ_UPLOAD_FORMAT_HINT } from '@/lib/faculty/parse-exam-text';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;

async function resolveFacultyOrAdminUser(request: NextRequest) {
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
  const user = await resolveFacultyOrAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const role = String(user.user_metadata?.role ?? '');
  if (role !== 'faculty' && role !== 'admin') {
    return NextResponse.json({ error: 'Faculty or admin access required' }, { status: 403 });
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

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 8 MB' }, { status: 400 });
  }

  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.csv') || file.type === 'text/csv') {
      const parsed = parseMcqCsv(await file.text());
      return NextResponse.json({
        questions: parsed.questions,
        count: parsed.questions.length,
        warnings: parsed.warnings,
        format: 'csv',
        formatHint: MCQ_UPLOAD_FORMAT_HINT,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, format } = await extractTextFromUpload(buffer, file.name, file.type);
    const parsed = parseMcqPlainText(text, format);

    if (parsed.questions.length === 0) {
      return NextResponse.json(
        {
          error: 'No MCQs could be extracted from this file.',
          warnings: parsed.warnings,
          textPreview: text.slice(0, 500),
          charsExtracted: text.length,
          formatHint: MCQ_UPLOAD_FORMAT_HINT,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      questions: parsed.questions,
      count: parsed.questions.length,
      warnings: parsed.warnings,
      format,
      charsExtracted: text.length,
      formatHint: MCQ_UPLOAD_FORMAT_HINT,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not read file. Use .csv, .docx, or text-based .pdf (not scanned images).',
        formatHint: MCQ_UPLOAD_FORMAT_HINT,
      },
      { status: 400 },
    );
  }
}
