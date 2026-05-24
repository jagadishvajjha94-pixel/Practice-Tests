import { NextResponse } from 'next/server';
import { loadAdminStudents, loadAllAttemptsRollup } from '@/lib/admin/attempts-rollup';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const warnings: string[] = [];

  const probe = await admin.from('test_attempts').select('id').limit(1);
  if (probe.error && isMissingTable(probe.error)) {
    warnings.push(
      'The test_attempts table is missing. Run supabase/migrations/008_test_attempts_student_dashboard.sql in Supabase.',
    );
  }

  const [students, rollup] = await Promise.all([
    loadAdminStudents(admin),
    loadAllAttemptsRollup(admin),
  ]);

  const studentById = new Map(students.map((s) => [s.id, s]));

  const enriched = rollup.attempts.map((a) => {
    const student = studentById.get(a.user_id);
    return {
      id: a.id,
      user_id: a.user_id,
      test_id: a.test_id,
      score: a.score,
      status: a.status,
      created_at: a.created_at,
      completed_at: a.completed_at,
      testName: a.test_name,
      studentName: student?.full_name?.trim() || student?.email || 'Student',
      studentEmail: student?.email || '—',
      roll_number: student?.roll_number || '',
      source: a.source,
    };
  });

  const tests = Array.from(rollup.testsById.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (enriched.length === 0 && warnings.length === 0) {
    warnings.push(
      'No attempts found yet. Students appear here when they start or submit an exam (ElevateX, faculty, or practice tests).',
    );
  }

  return NextResponse.json({ tests, attempts: enriched, warnings });
}
