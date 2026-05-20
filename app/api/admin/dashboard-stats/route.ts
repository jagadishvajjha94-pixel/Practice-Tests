import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { loadAdminStudents, loadAllAttemptsRollup } from '@/lib/admin/attempts-rollup';
import { listLiveExamSchedules } from '@/lib/admin/live-dashboard-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const [students, { attempts, testsById }, categoriesRes, liveSchedules] = await Promise.all([
    loadAdminStudents(admin),
    loadAllAttemptsRollup(admin),
    admin.from('test_categories').select('id, name, slug'),
    listLiveExamSchedules(admin),
  ]);

  const categories = categoriesRes.error
    ? []
    : (categoriesRes.data ?? []).map((c) => ({
        id: String(c.id),
        name: String(c.name),
        slug: String(c.slug),
      }));

  const tests = Array.from(testsById.entries()).map(([id, name]) => ({
    id,
    name,
    category_id: '',
  }));

  const { data: testsWithCat } = await admin.from('tests').select('id, title, name, category_id');
  for (const row of testsWithCat ?? []) {
    const id = String(row.id);
    const existing = tests.find((t) => t.id === id);
    if (existing) {
      existing.category_id = String(row.category_id ?? '');
      existing.name = String(row.title ?? row.name ?? existing.name);
    } else {
      tests.push({
        id,
        name: String(row.title ?? row.name ?? `Test ${id}`),
        category_id: String(row.category_id ?? ''),
      });
    }
  }

  const categoryByTestId = new Map<string, string>();
  for (const t of tests) {
    const cat = categories.find((c) => c.id === t.category_id);
    categoryByTestId.set(t.id, cat?.slug ?? '');
  }

  const studentById = new Map(students.map((s) => [s.id, s]));
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let psychometricSubmitted = 0;
  let swarxSubmitted = 0;
  const testsLast7Days = attempts.filter(
    (a) => new Date(a.created_at).getTime() >= sevenDaysAgo,
  ).length;

  const scoresByUser = new Map<string, number[]>();
  const studentStats = students.map((s) => ({
    ...s,
    attempts: 0,
    avgScore: 0,
    latestAttemptAt: null as string | null,
    highestScore: 0,
    highestTestName: null as string | null,
  }));
  const statsByUserId = new Map(studentStats.map((s) => [s.id, s]));

  for (const a of attempts) {
    const slug = (categoryByTestId.get(a.test_id ?? '') || '').toLowerCase();
    if (slug === 'psychometric') psychometricSubmitted += 1;
    if (slug === 'swarx') swarxSubmitted += 1;

    const row = statsByUserId.get(a.user_id);
    if (!row) continue;
    row.attempts += 1;
    if (a.score > row.highestScore) {
      row.highestScore = a.score;
      row.highestTestName = a.test_name;
    }
    if (!row.latestAttemptAt || new Date(a.created_at) > new Date(row.latestAttemptAt)) {
      row.latestAttemptAt = a.created_at;
    }
    if (!scoresByUser.has(a.user_id)) scoresByUser.set(a.user_id, []);
    scoresByUser.get(a.user_id)!.push(a.score);
  }

  for (const [userId, values] of scoresByUser.entries()) {
    const row = statsByUserId.get(userId);
    if (!row || values.length === 0) continue;
    row.avgScore = Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1));
  }

  const studentList = Array.from(statsByUserId.values());
  const attendedStudents = studentList.filter((s) => s.attempts > 0).length;

  return NextResponse.json({
    stats: {
      totalRegisteredUsers: students.length,
      totalStudentsAttended: attendedStudents,
      totalTestsSubmitted: attempts.length,
      avgTestsPerStudent:
        attendedStudents > 0 ? Number((attempts.length / attendedStudents).toFixed(1)) : 0,
      testsLast7Days,
      lowPerformers: studentList.filter((s) => s.attempts > 0 && s.avgScore < 40).length,
      psychometricSubmitted,
      swarxSubmitted,
    },
    students: studentList,
    attempts: attempts.map((a) => ({
      id: a.id,
      user_id: a.user_id,
      test_id: a.test_id,
      test_name: a.test_name,
      score: a.score,
      status: a.status,
      created_at: a.created_at,
      completed_at: a.completed_at,
      time_taken: a.time_taken,
      student: studentById.get(a.user_id) ?? null,
    })),
    tests,
    categories,
    liveSchedules,
  });
}
