import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { listStudentsInDepartment } from '@/lib/faculty/performance-data';
import { loadProctoringViolations } from '@/lib/proctoring/proctoring-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data: profile } = await admin
    .from('faculty_profiles')
    .select('department')
    .eq('user_id', auth.ctx.resolved.id)
    .maybeSingle();

  const department = profile?.department ?? auth.ctx.resolved.department;
  if (!department) {
    return NextResponse.json({ error: 'Faculty department not set' }, { status: 400 });
  }

  const students = await listStudentsInDepartment(admin, department);
  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0) {
    return NextResponse.json({
      department,
      violations: [],
      summary: { total: 0, byType: {}, studentsFlagged: 0, autoSubmits: 0 },
    });
  }

  const { violations, summary } = await loadProctoringViolations(admin, {
    userIds: studentIds,
  });

  const emailById = new Map(students.map((s) => [s.id, s.email]));
  const nameById = new Map(students.map((s) => [s.id, s.full_name]));

  const rows = violations.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
    full_name: nameById.get(row.user_id) ?? null,
  }));

  return NextResponse.json({
    department,
    violations: rows,
    summary,
  });
}
