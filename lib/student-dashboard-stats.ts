import type { SupabaseClient } from '@supabase/supabase-js';
import type { Test, TestAttempt } from '@/lib/types';

export type DashboardStatEntry = {
  id: string;
  user_id: string;
  test_id: string;
  test_name: string;
  score: number;
  status: TestAttempt['status'];
  created_at: string;
  completed_at: string | null;
  time_taken: number | null;
  total_questions?: number;
};

export function statEntryToAttempt(entry: DashboardStatEntry): TestAttempt & { test: Test } {
  const test: Test = {
    id: entry.test_id,
    name: entry.test_name,
    category_id: '',
    duration: 0,
    total_questions: entry.total_questions ?? 0,
    passing_score: null,
    description: null,
    difficulty_level: null,
    is_paid: false,
    created_at: entry.created_at,
    updated_at: entry.created_at,
  };
  return {
    id: entry.id,
    user_id: entry.user_id,
    test_id: entry.test_id,
    started_at: entry.created_at,
    completed_at: entry.completed_at,
    score: entry.score,
    answers: null,
    time_taken: entry.time_taken,
    status: entry.status,
    created_at: entry.created_at,
    test,
  };
}

export function buildStatEntry(input: {
  id: string;
  userId: string;
  testId: string;
  testName: string;
  scorePercent: number;
  elapsedSec?: number;
  completedAtIso?: string;
  totalQuestions?: number;
}): DashboardStatEntry {
  const now = input.completedAtIso ?? new Date().toISOString();
  return {
    id: input.id,
    user_id: input.userId,
    test_id: input.testId,
    test_name: input.testName,
    score: input.scorePercent,
    status: 'completed',
    created_at: now,
    completed_at: now,
    time_taken: input.elapsedSec ?? null,
    total_questions: input.totalQuestions,
  };
}

function parseAttemptsJson(raw: unknown): DashboardStatEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is DashboardStatEntry => {
    if (!row || typeof row !== 'object') return false;
    const o = row as DashboardStatEntry;
    return Boolean(o.id && o.user_id && o.test_name != null);
  });
}

export async function appendStudentDashboardStat(
  supabase: SupabaseClient,
  userId: string,
  entry: DashboardStatEntry,
): Promise<void> {
  const { data: existing } = await supabase
    .from('student_dashboard_stats')
    .select('attempts')
    .eq('user_id', userId)
    .maybeSingle();

  const list = parseAttemptsJson(existing?.attempts);
  const next = [entry, ...list.filter((row) => String(row.id) !== String(entry.id))].slice(0, 50);

  const { error } = await supabase.from('student_dashboard_stats').upsert(
    {
      user_id: userId,
      attempts: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    const msg = String(error.message ?? '').toLowerCase();
    if (error.code === 'PGRST205' || msg.includes('student_dashboard_stats')) {
      return;
    }
    throw error;
  }
}

export async function fetchStudentDashboardStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<TestAttempt & { test: Test }>> {
  const { data, error } = await supabase
    .from('student_dashboard_stats')
    .select('attempts')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const msg = String(error.message ?? '').toLowerCase();
    if (error.code === 'PGRST205' || msg.includes('student_dashboard_stats')) {
      return [];
    }
    throw error;
  }

  return parseAttemptsJson(data?.attempts).map(statEntryToAttempt);
}

