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

  // Approved exams owned by this faculty (regardless of branch — for impact
  // tracking we include cross-branch exams too).
  const { data: approved } = await admin
    .from('faculty_exam_requests')
    .select(
      'id, title, topic, published_test_id, target_years, target_branches, department, duration_minutes',
    )
    .eq('faculty_user_id', auth.ctx.resolved.id)
    .eq('status', 'approved')
    .not('published_test_id', 'is', null);

  const publishedExams = approved ?? [];
  const testIds = publishedExams.map((r) => r.published_test_id).filter(Boolean) as string[];
  const testTitleById = new Map(
    publishedExams.map((r) => [r.published_test_id as string, r]),
  );

  // Students in this faculty's primary department (the most common case);
  // performance API still focuses on the faculty's home branch for analytics.
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
    const bestScore =
      completed.length > 0
        ? Number(Math.max(...completed.map((a) => Number(a.score ?? 0))).toFixed(1))
        : 0;
    const lastAttempt = studentAttempts[0];

    return {
      ...student,
      attempts_count: studentAttempts.length,
      completed_count: completed.length,
      avg_score: avgScore,
      best_score: bestScore,
      last_attempt_at: lastAttempt?.completed_at ?? lastAttempt?.created_at ?? null,
      recent: studentAttempts.slice(0, 5).map((a) => ({
        ...a,
        test_title: testTitleById.get(a.test_id)?.title ?? 'Department exam',
        topic: testTitleById.get(a.test_id)?.topic ?? null,
      })),
    };
  });

  // Per-exam performance.
  const examStats = publishedExams.map((exam) => {
    const testId = exam.published_test_id as string;
    const examAttempts = attempts.filter((a) => a.test_id === testId);
    const completed = examAttempts.filter((a) => a.status === 'completed');
    const scores = completed.map((a) => Number(a.score ?? 0));
    const avg =
      scores.length > 0 ? Number((scores.reduce((s, n) => s + n, 0) / scores.length).toFixed(1)) : 0;
    const pass = scores.filter((s) => s >= 40).length;
    const passRate = scores.length > 0 ? Number(((pass / scores.length) * 100).toFixed(1)) : 0;
    return {
      exam_id: exam.id,
      test_id: testId,
      title: exam.title,
      topic: exam.topic ?? null,
      target_years: exam.target_years ?? [],
      attempts: examAttempts.length,
      completed: completed.length,
      avg_score: avg,
      pass_rate: passRate,
    };
  });

  // Score distribution buckets across all completed attempts.
  const completedAll = attempts.filter((a) => a.status === 'completed');
  const buckets = [
    { range: '0-20', from: 0, to: 20, count: 0 },
    { range: '20-40', from: 20, to: 40, count: 0 },
    { range: '40-60', from: 40, to: 60, count: 0 },
    { range: '60-80', from: 60, to: 80, count: 0 },
    { range: '80-100', from: 80, to: 101, count: 0 },
  ];
  for (const a of completedAll) {
    const s = Number(a.score ?? 0);
    const bucket = buckets.find((b) => s >= b.from && s < b.to);
    if (bucket) bucket.count += 1;
  }

  const overallAvg =
    completedAll.length > 0
      ? Number(
          (
            completedAll.reduce((sum, a) => sum + Number(a.score ?? 0), 0) / completedAll.length
          ).toFixed(1),
        )
      : 0;
  const passOverall = completedAll.filter((a) => Number(a.score ?? 0) >= 40).length;
  const passRateOverall =
    completedAll.length > 0
      ? Number(((passOverall / completedAll.length) * 100).toFixed(1))
      : 0;

  return NextResponse.json({
    department,
    published_exams: publishedExams,
    exam_stats: examStats,
    students: studentsWithAttempts,
    score_buckets: buckets,
    summary: {
      students_in_department: students?.length ?? 0,
      students_with_attempts: studentsWithAttempts.filter((s) => s.attempts_count > 0).length,
      total_attempts: attempts.length,
      total_completed: completedAll.length,
      overall_avg: overallAvg,
      pass_rate: passRateOverall,
    },
  });
}
