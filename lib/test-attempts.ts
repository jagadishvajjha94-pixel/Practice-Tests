import type { SupabaseClient } from '@supabase/supabase-js';
import type { Test, TestAttempt } from '@/lib/types';
import { adaptTestRow } from '@/lib/practice-mappers';
import {
  getBrowserDashboardAttempts,
} from '@/lib/local-test-attempts';
import { getSupabaseAuthHeaders } from '@/lib/supabase-auth-headers';

export { getBrowserDashboardAttempts };

export type AttemptRow = Record<string, unknown> & {
  id?: string | number;
  user_id?: string;
  test_id?: string | number;
  score?: number | string | null;
  percentage_score?: number | string | null;
  total_score?: number | string | null;
  status?: string;
  created_at?: string;
  completed_at?: string | null;
  started_at?: string;
  answers?: unknown;
  time_taken?: number | null;
};

export function toAttemptScore(row: AttemptRow): number {
  const score = toNum(row.score);
  if (score != null) return score;
  const pct = toNum(row.percentage_score);
  if (pct != null) return pct;
  return 0;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizeAttemptRow(row: AttemptRow): TestAttempt {
  const created = String(row.created_at ?? row.started_at ?? new Date().toISOString());
  return {
    id: String(row.id),
    user_id: String(row.user_id ?? ''),
    test_id: String(row.test_id ?? ''),
    started_at: String(row.started_at ?? created),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    score: toAttemptScore(row),
    answers:
      row.answers != null && typeof row.answers === 'object'
        ? (row.answers as Record<string, unknown>)
        : null,
    time_taken: row.time_taken != null ? Number(row.time_taken) : null,
    status: (row.status as TestAttempt['status']) || 'completed',
    created_at: created,
  };
}

export function fallbackTestForAttempt(attempt: TestAttempt): Test {
  const now = attempt.created_at;
  return {
    id: attempt.test_id,
    name: 'Practice test',
    category_id: '',
    duration: 0,
    total_questions: 0,
    passing_score: null,
    description: null,
    difficulty_level: null,
    is_paid: false,
    created_at: now,
    updated_at: now,
  };
}

export async function ensureStudentUserRow(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
): Promise<void> {
  const { data: existing } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
  if (existing?.id) return;

  await supabase.from('users').insert({
    id: user.id,
    email: user.email ?? '',
    full_name: String(user.user_metadata?.full_name ?? ''),
    subscription_status: 'free',
  });
}

export function isAttemptPersistenceError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const msg = (e.message ?? '').toLowerCase();
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    e.code === '23503' ||
    e.code === '22P02' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('violates foreign key') ||
    msg.includes('invalid input syntax')
  );
}

function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return e.code === 'PGRST204' && (e.message ?? '').toLowerCase().includes(`'${column.toLowerCase()}'`);
}

export type PersistAttemptInput = {
  userId: string;
  testId: string;
  testName?: string;
  scorePercent: number;
  rawNetScore: number;
  answers: Record<string, unknown>;
  elapsedSec: number;
  startedAtIso: string;
  completedAtIso: string;
};

export type DashboardAttemptView = TestAttempt & { test: Test };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function shouldOmitTestId(testId: string): boolean {
  if (!testId || testId.startsWith('fallback-')) return true;
  return !isUuid(testId);
}

export async function persistTestAttempt(
  supabase: SupabaseClient,
  input: PersistAttemptInput,
): Promise<{ id: string }> {
  const baseCommon = {
    user_id: input.userId,
    started_at: input.startedAtIso,
    completed_at: input.completedAtIso,
    status: 'completed' as const,
  };

  const base = shouldOmitTestId(input.testId)
    ? baseCommon
    : { ...baseCommon, test_id: input.testId };

  const title = input.testName?.trim() || 'Practice test';

  const payloads: Record<string, unknown>[] = [
    {
      ...base,
      score: input.scorePercent,
      time_taken: input.elapsedSec,
      answers: input.answers,
      test_title: title,
    },
    {
      ...base,
      percentage_score: input.scorePercent,
      total_score: input.rawNetScore,
      test_title: title,
    },
    {
      ...base,
      percentage_score: input.scorePercent,
      total_score: input.rawNetScore,
    },
    {
      user_id: input.userId,
      percentage_score: input.scorePercent,
      status: 'completed',
      completed_at: input.completedAtIso,
    },
    {
      user_id: input.userId,
      score: input.scorePercent,
      status: 'completed',
    },
    base,
  ];

  let attemptId: string | null = null;
  let lastError: unknown = null;

  for (const payload of payloads) {
    const { data, error } = await supabase.from('test_attempts').insert(payload).select('id').single();
    if (!error && data?.id != null) {
      attemptId = String(data.id);
      break;
    }
    lastError = error;
    if (
      !isMissingColumnError(error, 'score') &&
      !isMissingColumnError(error, 'answers') &&
      !isMissingColumnError(error, 'time_taken') &&
      !isMissingColumnError(error, 'percentage_score') &&
      !isMissingColumnError(error, 'total_score') &&
      !isMissingColumnError(error, 'test_title') &&
      !isMissingColumnError(error, 'started_at') &&
      !isMissingColumnError(error, 'completed_at') &&
      !isMissingColumnError(error, 'status') &&
      !isMissingColumnError(error, 'test_id')
    ) {
      const code = (error as { code?: string })?.code;
      if (code === '23503' || code === '22P02') continue;
      throw error;
    }
  }

  if (!attemptId) {
    throw lastError ?? new Error('Could not save test attempt');
  }

  const updates: Record<string, unknown>[] = [
    { score: input.scorePercent, time_taken: input.elapsedSec, answers: input.answers },
    {
      percentage_score: input.scorePercent,
      total_score: input.rawNetScore,
      completed_at: input.completedAtIso,
      status: 'completed',
    },
  ];

  for (const patch of updates) {
    const { error } = await supabase.from('test_attempts').update(patch).eq('id', attemptId);
    if (!error) break;
    if (
      !isMissingColumnError(error, 'score') &&
      !isMissingColumnError(error, 'answers') &&
      !isMissingColumnError(error, 'time_taken') &&
      !isMissingColumnError(error, 'percentage_score')
    ) {
      // Non-fatal if row already has score from insert
      break;
    }
  }

  return { id: attemptId };
}

function rowToDashboardAttempt(row: AttemptRow, testOverride?: Test): DashboardAttemptView {
  const attempt = normalizeAttemptRow(row);
  const titleFromRow = (row as { test_title?: string }).test_title;
  const embedded = (row as { test?: Record<string, unknown> }).test;
  const test =
    testOverride ??
    (embedded ? adaptTestRow(embedded) : null) ??
    (titleFromRow
      ? { ...fallbackTestForAttempt(attempt), name: String(titleFromRow) }
      : fallbackTestForAttempt(attempt));
  return { ...attempt, test };
}

async function queryAttempts(
  supabase: SupabaseClient,
  userId: string,
): Promise<AttemptRow[]> {
  const attempts = async (orderCol: string) =>
    supabase.from('test_attempts').select('*').eq('user_id', userId).order(orderCol, {
      ascending: false,
    }).limit(30);

  const byCreated = await attempts('created_at');
  if (!byCreated.error && byCreated.data?.length) {
    return byCreated.data as AttemptRow[];
  }

  const byStarted = await attempts('started_at');
  if (!byStarted.error && byStarted.data?.length) {
    return byStarted.data as AttemptRow[];
  }

  const byId = await attempts('id');
  if (!byId.error && byId.data?.length) {
    return byId.data as AttemptRow[];
  }

  const plain = await supabase.from('test_attempts').select('*').eq('user_id', userId).limit(30);
  if (!plain.error && plain.data?.length) {
    return plain.data as AttemptRow[];
  }

  return [];
}

export async function fetchAttemptsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardAttemptView[]> {
  const rows = await queryAttempts(supabase, userId);
  if (!rows.length) return [];

  const testIds = [...new Set(rows.map((r) => String(r.test_id ?? '')).filter(Boolean))];
  const byId = new Map<string, Test>();
  if (testIds.length) {
    const { data: tests } = await supabase.from('tests').select('*').in('id', testIds);
    for (const t of tests ?? []) {
      byId.set(String((t as { id: unknown }).id), adaptTestRow(t as Record<string, unknown>));
    }
  }

  return rows.map((row) => {
    const attempt = normalizeAttemptRow(row);
    return rowToDashboardAttempt(row, byId.get(attempt.test_id));
  });
}

export async function fetchStudentDashboardAttempts(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardAttemptView[]> {
  const browser = getBrowserDashboardAttempts<DashboardAttemptView>(userId);

  let serverAttempts: DashboardAttemptView[] = [];
  try {
    const authHeaders = await getSupabaseAuthHeaders(supabase);
    const res = await fetch('/api/student/test-attempts', {
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders,
    });
    if (res.ok) {
      const json = (await res.json()) as { attempts?: DashboardAttemptView[] };
      serverAttempts = json.attempts ?? [];
    }
  } catch {
    // fall through
  }

  if (!serverAttempts.length) {
    serverAttempts = await fetchAttemptsForUser(supabase, userId);
  }

  return mergeAttempts(browser, serverAttempts).slice(0, 15);
}

function mergeAttempts<T extends TestAttempt & { test: Test }>(local: T[], server: T[]): T[] {
  return [...local, ...server]
    .filter((a, idx, arr) => arr.findIndex((x) => String(x.id) === String(a.id)) === idx)
    .sort(
      (a, b) =>
        new Date(b.created_at ?? b.completed_at ?? 0).getTime() -
        new Date(a.created_at ?? a.completed_at ?? 0).getTime(),
    );
}
