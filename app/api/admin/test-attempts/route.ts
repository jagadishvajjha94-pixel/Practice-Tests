import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const msg = String(e.message ?? '').toLowerCase();
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function pickTestLabel(row: Record<string, unknown>): string {
  const name = row.name ?? row.title;
  return String(name ?? 'Unnamed test');
}

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const warnings: string[] = [];

  const { data: attemptsData, error: attemptsErr } = await admin
    .from('test_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (attemptsErr) {
    if (isMissingTable(attemptsErr)) {
      return NextResponse.json({
        tests: [],
        attempts: [],
        warnings: [
          'The test_attempts table is missing. Run supabase/migrations/008_test_attempts_student_dashboard.sql in Supabase.',
        ],
      });
    }
    return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
  }

  const attempts = (attemptsData ?? []) as Array<Record<string, unknown>>;

  const testsById = new Map<string, { id: string; name: string }>();
  const { data: testsData, error: testsErr } = await admin
    .from('tests')
    .select('id, name, title, created_at')
    .order('created_at', { ascending: false });

  if (testsErr) {
    if (isMissingTable(testsErr)) {
      warnings.push(
        'The tests catalog table is missing. Run supabase/migrations/006_test_categories_and_exam_core.sql (optional — attempts still load using saved titles).',
      );
    } else {
      warnings.push(`Could not load tests: ${testsErr.message}`);
    }
  } else {
    for (const row of testsData ?? []) {
      const id = String(row.id);
      testsById.set(id, { id, name: pickTestLabel(row as Record<string, unknown>) });
    }
  }

  const facultyTitleByTestId = new Map<string, string>();
  const { data: facultyRows, error: facultyErr } = await admin
    .from('faculty_exam_requests')
    .select('published_test_id, title')
    .eq('status', 'approved')
    .not('published_test_id', 'is', null);

  if (!facultyErr) {
    for (const row of facultyRows ?? []) {
      if (row.published_test_id) {
        facultyTitleByTestId.set(String(row.published_test_id), String(row.title ?? 'Department exam'));
      }
    }
  }

  const usersById = new Map<string, { full_name: string | null; email: string }>();
  const { data: usersData, error: usersErr } = await admin.from('users').select('id, email, full_name');

  if (usersErr && !isMissingTable(usersErr)) {
    warnings.push(`Could not load user profiles: ${usersErr.message}`);
  } else {
    for (const row of usersData ?? []) {
      usersById.set(String(row.id), {
        email: String(row.email ?? ''),
        full_name: (row.full_name as string | null) ?? null,
      });
    }
  }

  const resolveTestName = (attempt: Record<string, unknown>): string => {
    const savedTitle = attempt.test_title;
    if (savedTitle && String(savedTitle).trim()) return String(savedTitle).trim();

    const testId = attempt.test_id != null ? String(attempt.test_id) : '';
    if (testId) {
      const fromTests = testsById.get(testId);
      if (fromTests) return fromTests.name;
      const fromFaculty = facultyTitleByTestId.get(testId);
      if (fromFaculty) return fromFaculty;
      return `Test ${testId.slice(0, 8)}`;
    }
    return 'Practice test';
  };

  const enriched = attempts.map((a) => {
    const userId = String(a.user_id ?? '');
    const user = usersById.get(userId);
    const testId = a.test_id != null ? String(a.test_id) : '';
    const testName = resolveTestName(a);

    if (testId && !testsById.has(testId)) {
      testsById.set(testId, { id: testId, name: testName });
    }

    const score =
      a.percentage_score != null
        ? Number(a.percentage_score)
        : a.score != null
          ? Number(a.score)
          : null;

    return {
      id: a.id,
      user_id: userId,
      test_id: testId || null,
      score,
      status: String(a.status ?? 'completed'),
      created_at: String(a.created_at ?? a.completed_at ?? new Date().toISOString()),
      completed_at: a.completed_at ? String(a.completed_at) : null,
      testName,
      studentName: user?.full_name || 'Student',
      studentEmail: user?.email || '—',
    };
  });

  const tests = Array.from(testsById.values()).sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ tests, attempts: enriched, warnings });
}
