import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { partitionEvaloraModulesForStudent, type EvaloraModuleScheduleRow } from '@/lib/evalora/module-schedule';
import { partitionSchedulesForStudent, type ExamScheduleRow } from '@/lib/exam-schedule';
import { buildStudentPortalPayload } from '@/lib/student-portal';

export async function GET() {
  const auth = await requireAuth(['student']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json(
      buildStudentPortalPayload({
        evaloraLive: [],
        evaloraUpcoming: [],
        facultyLive: [],
        facultyUpcoming: [],
        department: null,
        year: null,
      }),
    );
  }

  const { data: profile } = await admin
    .from('users')
    .select('branch, academic_year, full_name')
    .eq('id', auth.ctx.resolved.id)
    .maybeSingle();

  const department = profile?.branch ?? auth.ctx.resolved.department ?? null;
  const year = profile?.academic_year ?? auth.ctx.resolved.academicYear ?? null;

  if (!department || !year) {
    return NextResponse.json(
      buildStudentPortalPayload({
        evaloraLive: [],
        evaloraUpcoming: [],
        facultyLive: [],
        facultyUpcoming: [],
        department,
        year,
        message: 'Complete your profile (department and year) to see scheduled examinations.',
      }),
    );
  }

  const [{ data: evaloraRows }, { data: scheduleRows }] = await Promise.all([
    admin.from('evalora_module_schedules').select('*').neq('status', 'ended').order('starts_at', { ascending: true }),
    admin.from('exam_schedules').select('*').neq('status', 'ended').order('starts_at', { ascending: true }),
  ]);

  const facultyIds = [
    ...new Set(
      (scheduleRows ?? [])
        .map((s) => s.faculty_exam_request_id as string | null)
        .filter(Boolean) as string[],
    ),
  ];

  const extras = new Map<string, { duration_minutes?: number; topic?: string | null }>();
  if (facultyIds.length) {
    const { data: facultyRows } = await admin
      .from('faculty_exam_requests')
      .select('id, duration_minutes, topic')
      .in('id', facultyIds);
    for (const row of facultyRows ?? []) {
      extras.set(row.id as string, {
        duration_minutes: row.duration_minutes as number,
        topic: (row.topic as string | null) ?? null,
      });
    }
  }

  const evalora = partitionEvaloraModulesForStudent(
    (evaloraRows ?? []) as EvaloraModuleScheduleRow[],
    department,
    year,
  );
  const faculty = partitionSchedulesForStudent(
    (scheduleRows ?? []) as ExamScheduleRow[],
    department,
    year,
    extras,
  );

  return NextResponse.json({
    ...buildStudentPortalPayload({
      evaloraLive: evalora.live,
      evaloraUpcoming: evalora.upcoming,
      facultyLive: faculty.live,
      facultyUpcoming: faculty.upcoming,
      department,
      year,
    }),
    studentName: profile?.full_name ?? auth.ctx.user.email ?? null,
  });
}
