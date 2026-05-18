import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

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

  const { data: approved } = await admin
    .from('faculty_exam_requests')
    .select('published_test_id, title')
    .eq('department', department)
    .eq('status', 'approved')
    .not('published_test_id', 'is', null);

  const testIds = (approved ?? [])
    .map((r) => r.published_test_id)
    .filter(Boolean) as string[];

  const testTitleById = new Map(
    (approved ?? []).map((r) => [r.published_test_id as string, r.title as string]),
  );

  const { data: students } = await admin
    .from('users')
    .select('id, email, full_name, branch, academic_year')
    .eq('branch', department);

  const studentIds = (students ?? []).map((s) => s.id as string);

  let attempts: Array<{
    id: string;
    user_id: string;
    test_id: string;
    score: number | null;
    status: string | null;
    completed_at: string | null;
    created_at: string | null;
  }> = [];

  if (studentIds.length > 0 && testIds.length > 0) {
    const { data: attemptRows } = await admin
      .from('test_attempts')
      .select('id, user_id, test_id, score, status, completed_at, created_at')
      .in('user_id', studentIds)
      .in('test_id', testIds)
      .order('created_at', { ascending: false });

    attempts = (attemptRows ?? []) as typeof attempts;
  }

  const studentsWithAttempts = (students ?? []).map((student) => {
    const studentAttempts = attempts.filter((a) => a.user_id === student.id);
    const completed = studentAttempts.filter((a) => a.status === 'completed');
    const avgScore =
      completed.length > 0
        ? Number(
            (
              completed.reduce((sum, a) => sum + Number(a.score ?? 0), 0) / completed.length
            ).toFixed(1),
          )
        : 0;

    return {
      ...student,
      attempts_count: studentAttempts.length,
      completed_count: completed.length,
      avg_score: avgScore,
      recent: studentAttempts.slice(0, 5).map((a) => ({
        ...a,
        test_title: testTitleById.get(a.test_id) ?? 'Department exam',
      })),
    };
  });

  return NextResponse.json({
    department,
    published_exams: approved ?? [],
    students: studentsWithAttempts,
    summary: {
      students_in_department: students?.length ?? 0,
      students_with_attempts: studentsWithAttempts.filter((s) => s.attempts_count > 0).length,
      total_attempts: attempts.length,
    },
  });
}
