import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { listStudentsInDepartment } from '@/lib/faculty/performance-data';

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
    return NextResponse.json({ department, violations: [], summary: { total: 0 } });
  }

  const { data: violations } = await admin
    .from('exam_violations')
    .select('id, user_id, test_id, attempt_id, violation_type, metadata, created_at')
    .in('user_id', studentIds)
    .order('created_at', { ascending: false })
    .limit(200);

  const emailById = new Map(students.map((s) => [s.id, s.email]));
  const nameById = new Map(students.map((s) => [s.id, s.full_name]));

  const rows = (violations ?? []).map((row) => ({
    ...row,
    email: emailById.get(row.user_id as string) ?? null,
    full_name: nameById.get(row.user_id as string) ?? null,
  }));

  const byType = rows.reduce<Record<string, number>>((acc, row) => {
    const t = String(row.violation_type);
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    department,
    violations: rows,
    summary: {
      total: rows.length,
      byType,
      studentsFlagged: new Set(rows.map((r) => r.user_id)).size,
    },
  });
}
