import type { SupabaseClient } from '@supabase/supabase-js';
import { departmentsMatch, examMatchesDepartment } from '@/lib/faculty/department-match';
import { departmentsForPerformanceView } from '@/lib/department-groups';
import { resolveStoredPercent, testIdsMatch } from '@/lib/test-attempts';
import type { DashboardStatEntry } from '@/lib/student-dashboard-stats';

export type DeptStudent = {
  id: string;
  email: string;
  full_name: string | null;
  branch: string | null;
  academic_year: string | null;
};

export type PublishedDeptExam = {
  id: string;
  title: string;
  topic: string | null;
  published_test_id: string;
  target_years: string[];
  target_branches: string[];
  department: string;
  duration_minutes: number;
};

type RawAttempt = {
  id: string;
  user_id: string;
  test_id: string | null;
  test_title: string | null;
  score: number | null;
  percentage_score: number | null;
  total_score: number | null;
  status: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export type MatchedAttempt = RawAttempt & {
  resolved_test_id: string | null;
  score_percent: number;
};

const EXAM_SELECT =
  'id, title, topic, published_test_id, target_years, target_branches, department, duration_minutes';

export async function listStudentsInDepartments(
  admin: SupabaseClient,
  departments: string[],
): Promise<DeptStudent[]> {
  const targets = departments.filter(Boolean);
  if (targets.length === 0) return [];

  const byId = new Map<string, DeptStudent>();

  const { data: dbUsers } = await admin
    .from('users')
    .select('id, email, full_name, branch, academic_year');

  for (const row of dbUsers ?? []) {
    const branch = row.branch as string | null;
    if (!targets.some((dept) => departmentsMatch(branch, dept))) continue;
    byId.set(row.id as string, {
      id: row.id as string,
      email: String(row.email ?? ''),
      full_name: (row.full_name as string | null) ?? null,
      branch,
      academic_year: (row.academic_year as string | null) ?? null,
    });
  }

  let page = 1;
  const perPage = 200;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      if (byId.has(user.id)) continue;

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const role = String(meta.role ?? 'student');
      if (role === 'admin' || role === 'faculty') continue;

      const savedProfile = (meta.prep_profile ?? {}) as Record<string, unknown>;
      const branch =
        (savedProfile.branch as string | undefined) ??
        (meta.department as string | undefined) ??
        (meta.branch as string | undefined) ??
        null;

      if (!targets.some((dept) => departmentsMatch(branch, dept))) continue;

      byId.set(user.id, {
        id: user.id,
        email: user.email ?? '',
        full_name:
          (savedProfile.full_name as string | undefined) ??
          (meta.full_name as string | undefined) ??
          (meta.name as string | undefined) ??
          null,
        branch,
        academic_year:
          (savedProfile.academic_year as string | undefined) ??
          (meta.year as string | undefined) ??
          null,
      });
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return Array.from(byId.values()).sort((a, b) =>
    (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email),
  );
}

export async function listStudentsInDepartment(
  admin: SupabaseClient,
  department: string,
): Promise<DeptStudent[]> {
  return listStudentsInDepartments(admin, [department]);
}

export async function listDepartmentApprovedExams(
  admin: SupabaseClient,
  department: string,
): Promise<PublishedDeptExam[]> {
  const { data: requests } = await admin
    .from('faculty_exam_requests')
    .select(EXAM_SELECT)
    .eq('status', 'approved')
    .not('published_test_id', 'is', null);

  return (requests ?? [])
    .filter((row) => examMatchesDepartment(row, department))
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      topic: (row.topic as string | null) ?? null,
      published_test_id: row.published_test_id as string,
      target_years: ((row.target_years as string[]) ?? []) as string[],
      target_branches: ((row.target_branches as string[]) ?? []) as string[],
      department: row.department as string,
      duration_minutes: Number(row.duration_minutes ?? 0),
    }));
}

function examTitleKeys(title: string): string[] {
  const base = title.toLowerCase().trim();
  if (!base) return [];
  return [base, `department · ${base}`];
}

function parseStatAttempts(raw: unknown): DashboardStatEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is DashboardStatEntry => {
    if (!row || typeof row !== 'object') return false;
    const o = row as DashboardStatEntry;
    return Boolean(o.id && o.user_id);
  });
}

function resolveAttemptExamTestId(
  attempt: RawAttempt,
  publishedExams: PublishedDeptExam[],
): string | null {
  const testId = attempt.test_id ? String(attempt.test_id) : '';
  if (testId) {
    const direct = publishedExams.find((e) => testIdsMatch(e.published_test_id, testId));
    if (direct) return direct.published_test_id;
  }

  const title = String(attempt.test_title ?? '').toLowerCase().trim();
  if (title) {
    for (const exam of publishedExams) {
      const keys = examTitleKeys(exam.title);
      if (keys.some((k) => title === k || title.includes(k) || k.includes(title))) {
        return exam.published_test_id;
      }
    }
  }

  return testId || null;
}

export async function fetchDepartmentExamAttempts(
  admin: SupabaseClient,
  studentIds: string[],
  publishedExams: PublishedDeptExam[],
): Promise<MatchedAttempt[]> {
  if (studentIds.length === 0) return [];

  const { data: attemptRows } = await admin
    .from('test_attempts')
    .select(
      'id, user_id, test_id, test_title, score, percentage_score, total_score, status, completed_at, created_at',
    )
    .in('user_id', studentIds)
    .order('created_at', { ascending: false });

  const merged: RawAttempt[] = [...((attemptRows ?? []) as RawAttempt[])];
  const seen = new Set(merged.map((a) => String(a.id)));

  if (studentIds.length > 0) {
    const { data: statsRows } = await admin
      .from('student_dashboard_stats')
      .select('user_id, attempts')
      .in('user_id', studentIds);

    for (const row of statsRows ?? []) {
      for (const entry of parseStatAttempts(row.attempts)) {
        if (seen.has(String(entry.id))) continue;
        if (!studentIds.includes(entry.user_id)) continue;
        merged.push({
          id: entry.id,
          user_id: entry.user_id,
          test_id: entry.test_id,
          test_title: entry.test_name,
          score: entry.score,
          percentage_score: entry.score,
          total_score: null,
          status: entry.status,
          completed_at: entry.completed_at,
          created_at: entry.created_at,
        });
        seen.add(String(entry.id));
      }
    }
  }

  return merged
    .map((row) => {
      const attempt = row as RawAttempt;
      const resolved =
        resolveAttemptExamTestId(attempt, publishedExams) ??
        (attempt.test_id ? String(attempt.test_id) : null);
      return {
        ...attempt,
        resolved_test_id: resolved,
        score_percent: resolveStoredPercent(
          attempt.percentage_score,
          attempt.score,
          attempt.total_score,
        ),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
}

export type FacultyPerformancePayload = {
  department: string;
  published_exams: PublishedDeptExam[];
  exam_stats: Array<{
    exam_id: string;
    test_id: string;
    title: string;
    topic: string | null;
    target_years: string[];
    attempts: number;
    completed: number;
    avg_score: number;
    pass_rate: number;
  }>;
  students: Array<
    DeptStudent & {
      attempts_count: number;
      completed_count: number;
      avg_score: number;
      best_score: number;
      last_attempt_at: string | null;
      recent: Array<{
        id: string;
        test_title: string;
        topic: string | null;
        score: number;
        status: string | null;
        completed_at: string | null;
        created_at: string | null;
      }>;
    }
  >;
  score_buckets: Array<{ range: string; from: number; to: number; count: number }>;
  summary: {
    students_in_department: number;
    students_with_attempts: number;
    total_attempts: number;
    total_completed: number;
    overall_avg: number;
    pass_rate: number;
  };
};

export function buildFacultyPerformancePayload(
  department: string,
  publishedExams: PublishedDeptExam[],
  students: DeptStudent[],
  attempts: MatchedAttempt[],
): FacultyPerformancePayload {
  const testTitleById = new Map(
    publishedExams.map((exam) => [exam.published_test_id, exam]),
  );

  const studentsWithAttempts = students.map((student) => {
    const studentAttempts = attempts.filter((a) => a.user_id === student.id);
    const completed = studentAttempts.filter((a) => a.status === 'completed');
    const avgScore =
      completed.length > 0
        ? Number(
            (
              completed.reduce((sum, a) => sum + a.score_percent, 0) / completed.length
            ).toFixed(1),
          )
        : 0;
    const bestScore =
      completed.length > 0
        ? Number(Math.max(...completed.map((a) => a.score_percent)).toFixed(1))
        : 0;
    const lastAttempt = studentAttempts[0];

    return {
      ...student,
      attempts_count: studentAttempts.length,
      completed_count: completed.length,
      avg_score: avgScore,
      best_score: bestScore,
      last_attempt_at: lastAttempt?.completed_at ?? lastAttempt?.created_at ?? null,
      recent: studentAttempts.slice(0, 5).map((a) => {
        const exam = a.resolved_test_id ? testTitleById.get(a.resolved_test_id) : undefined;
        return {
          id: a.id,
          test_title: exam?.title ?? a.test_title ?? 'Department exam',
          topic: exam?.topic ?? null,
          score: a.score_percent,
          status: a.status,
          completed_at: a.completed_at,
          created_at: a.created_at,
        };
      }),
    };
  });

  const examStats = publishedExams.map((exam) => {
    const testId = exam.published_test_id;
    const examAttempts = attempts.filter(
      (a) => a.resolved_test_id && testIdsMatch(a.resolved_test_id, testId),
    );
    const completed = examAttempts.filter((a) => a.status === 'completed');
    const scores = completed.map((a) => a.score_percent);
    const avg =
      scores.length > 0 ? Number((scores.reduce((s, n) => s + n, 0) / scores.length).toFixed(1)) : 0;
    const pass = scores.filter((s) => s >= 40).length;
    const passRate = scores.length > 0 ? Number(((pass / scores.length) * 100).toFixed(1)) : 0;
    return {
      exam_id: exam.id,
      test_id: testId,
      title: exam.title,
      topic: exam.topic,
      target_years: exam.target_years,
      attempts: examAttempts.length,
      completed: completed.length,
      avg_score: avg,
      pass_rate: passRate,
    };
  });

  const completedAll = attempts.filter((a) => a.status === 'completed');
  const buckets = [
    { range: '0-20', from: 0, to: 20, count: 0 },
    { range: '20-40', from: 20, to: 40, count: 0 },
    { range: '40-60', from: 40, to: 60, count: 0 },
    { range: '60-80', from: 60, to: 80, count: 0 },
    { range: '80-100', from: 80, to: 101, count: 0 },
  ];
  for (const a of completedAll) {
    const s = a.score_percent;
    const bucket = buckets.find((b) => s >= b.from && s < b.to);
    if (bucket) bucket.count += 1;
  }

  const overallAvg =
    completedAll.length > 0
      ? Number(
          (
            completedAll.reduce((sum, a) => sum + a.score_percent, 0) / completedAll.length
          ).toFixed(1),
        )
      : 0;
  const passOverall = completedAll.filter((a) => a.score_percent >= 40).length;
  const passRateOverall =
    completedAll.length > 0
      ? Number(((passOverall / completedAll.length) * 100).toFixed(1))
      : 0;

  return {
    department,
    published_exams: publishedExams,
    exam_stats: examStats,
    students: studentsWithAttempts,
    score_buckets: buckets,
    summary: {
      students_in_department: students.length,
      students_with_attempts: studentsWithAttempts.filter((s) => s.attempts_count > 0).length,
      total_attempts: attempts.length,
      total_completed: completedAll.length,
      overall_avg: overallAvg,
      pass_rate: passRateOverall,
    },
  };
}

export async function loadFacultyPerformanceData(
  admin: SupabaseClient,
  department: string,
): Promise<FacultyPerformancePayload> {
  const publishedExams = await listDepartmentApprovedExams(admin, department);
  const scopeDepartments = departmentsForPerformanceView(department, publishedExams);
  const students = await listStudentsInDepartments(admin, scopeDepartments);

  const studentIds = students.map((s) => s.id);
  const attempts = await fetchDepartmentExamAttempts(admin, studentIds, publishedExams);

  return buildFacultyPerformancePayload(department, publishedExams, students, attempts);
}
