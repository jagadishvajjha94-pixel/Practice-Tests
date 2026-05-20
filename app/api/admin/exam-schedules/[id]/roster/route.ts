import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { parseRosterCsv } from '@/lib/exam-roster/parse-roster-csv';
import { getRosterCountsBySchedule } from '@/lib/exam-roster/roster-access';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await context.params;
  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const counts = await getRosterCountsBySchedule(admin, [id]);
  const count = counts.get(id) ?? 0;

  const { data: sample } = await admin
    .from('exam_student_roster')
    .select('roll_number, full_name, branch, academic_year, email')
    .eq('exam_schedule_id', id)
    .order('roll_number', { ascending: true })
    .limit(20);

  return NextResponse.json({
    exam_schedule_id: id,
    count,
    sample: sample ?? [],
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const { id: scheduleId } = await context.params;
  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data: schedule } = await admin
    .from('exam_schedules')
    .select('id, title')
    .eq('id', scheduleId)
    .maybeSingle();

  if (!schedule) {
    return NextResponse.json({ error: 'Exam schedule not found' }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const replace = form.get('replace') !== 'false';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Upload a CSV file (field name: file)' }, { status: 400 });
  }

  const text = await file.text();
  const { rows, errors: parseErrors } = parseRosterCsv(text);

  if (!rows.length) {
    return NextResponse.json(
      {
        error: 'No valid student rows found in CSV.',
        parseErrors,
      },
      { status: 400 },
    );
  }

  if (replace) {
    await admin.from('exam_student_roster').delete().eq('exam_schedule_id', scheduleId);
  }

  const payload = rows.map((row) => ({
    exam_schedule_id: scheduleId,
    roll_number: row.roll_number,
    email: row.email,
    full_name: row.full_name,
    branch: row.branch,
    academic_year: row.academic_year,
  }));

  const chunkSize = 200;
  let inserted = 0;
  const insertErrors: string[] = [];

  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await admin.from('exam_student_roster').insert(chunk);
    if (error) {
      const msg = String(error.message ?? '');
      if (msg.includes('exam_student_roster') || msg.includes('schema cache')) {
        return NextResponse.json(
          {
            error:
              'Run supabase/migrations/029_exam_student_roster.sql in Supabase SQL editor, wait 30s, then retry.',
          },
          { status: 500 },
        );
      }
      insertErrors.push(msg);
      break;
    }
    inserted += chunk.length;
  }

  return NextResponse.json({
    ok: true,
    exam_schedule_id: scheduleId,
    title: schedule.title,
    imported: inserted,
    total_parsed: rows.length,
    parseErrors,
    insertErrors,
    replace,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await context.params;
  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  await admin.from('exam_student_roster').delete().eq('exam_schedule_id', id);
  return NextResponse.json({ ok: true, cleared: true });
}
