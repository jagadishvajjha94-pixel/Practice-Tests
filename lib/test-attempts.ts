import type { SupabaseClient } from '@supabase/supabase-js';
import type { Test, TestAttempt } from '@/lib/types';
import { adaptTestRow } from '@/lib/practice-mappers';
import { getDashboardFeedAttempts } from '@/lib/dashboard-feed';
import { getBrowserDashboardAttempts } from '@/lib/local-test-attempts';
import {
  fetchStudentDashboardStats,
  type DashboardStatEntry,
} from '@/lib/student-dashboard-stats';
import { getSupabaseAuthHeaders } from '@/lib/supabase-auth-headers';

export { getBrowserDashboardAttempts, getDashboardFeedAttempts };

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
  return resolveStoredPercent(
    toNum(row.percentage_score),
    toNum(row.score),
    toNum(row.total_score),
  );
}

/** Prefer explicit percentage; ignore raw net score mistakenly stored in `score`. */
export function resolveStoredPercent(
  percentageScore?: number | null,
  score?: number | null,
  totalScoreRaw?: number | null,
  totalQuestions?: number,
): number {
  const pct = percentageScore;
  if (pct != null && pct >= 0 && pct <= 100) return pct;

  const s = score;
  const total = totalScoreRaw;
  const q = totalQuestions ?? 0;

  if (s != null && s >= 0 && s <= 100) return s;

  if (s != null && q > 0 && s <= q && total == null) {
    return Math.round((s / q) * 100);
  }

  if (total != null && q > 0) {
    return Math.round((total / q) * 100);
  }

  if (s != null) return s;
  return 0;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export type CompletedAttemptSummary = {
  id: string;
  score: number;
  completed_at: string | null;
};

export function testIdsMatch(stored: unknown, target: string): boolean {
  const s = String(stored ?? '').trim();
  const t = target.trim();
  if (!s || !t) return false;
  if (s === t) return true;
  if (/^\d+$/.test(s) && /^\d+$/.test(t) && Number(s) === Number(t)) return true;
  return false;
}

export function isAttemptRowCompleted(row: AttemptRow): boolean {
  const status = String(row.status ?? '').toLowerCase();
  if (status === 'completed' || status === 'submitted') return true;
  return Boolean(row.completed_at);
}

/** Returns a prior completed submission for this test, if any. */
export async function findCompletedAttemptForTest(
  supabase: SupabaseClient,
  userId: string,
  testId: string,
): Promise<CompletedAttemptSummary | null> {
  const rows = await queryAttempts(supabase, userId);
  for (const row of rows) {
    if (!testIdsMatch(row.test_id, testId)) continue;
    if (!isAttemptRowCompleted(row)) continue;
    const attempt = normalizeAttemptRow(row);
    return {
      id: attempt.id,
      score: attempt.score,
      completed_at: attempt.completed_at,
    };
  }

  const stats = await fetchStudentDashboardStats(supabase, userId);
  for (const entry of stats) {
    if (!testIdsMatch(entry.test_id, testId)) continue;
    if (entry.status !== 'completed' && !entry.completed_at) continue;
    return {
      id: entry.id,
      score: entry.score,
      completed_at: entry.completed_at,
    };
  }

  return null;
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
  proctorSessionId?: string;
  proctorViolations?: number;
  proctorAutoSubmit?: boolean;
};

export type DashboardAttemptView = TestAttempt & { test: Test };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function shouldOmitTestId(testId: string): boolean {
  if (!testId || testId.startsWith('fallback-')) return true;
  if (testId === 'programming-assessment-v1') return true;
  return false;
}

async function resolveTestIdForInsert(
  supabase: SupabaseClient,
  testId: string,
): Promise<string | null> {
  if (shouldOmitTestId(testId)) {
    const { data } = await supabase.from('tests').select('id').limit(1).maybeSingle();
    if (data?.id != null) return String(data.id);
    return null;
  }
  return testId.trim();
}

export async function persistTestAttempt(
  supabase: SupabaseClient,
  input: PersistAttemptInput,
): Promise<{ id: string }> {
  const resolvedTestId = await resolveTestIdForInsert(supabase, input.testId);

  const baseCommon = {
    user_id: input.userId,
    started_at: input.startedAtIso,
    completed_at: input.completedAtIso,
    status: 'completed' as const,
  };

  const base =
    resolvedTestId != null
      ? { ...baseCommon, test_id: resolvedTestId }
      : baseCommon;

  const title = input.testName?.trim() || 'Practice test';
  const proctorFields =
    input.proctorSessionId != null ||
    input.proctorViolations != null ||
    input.proctorAutoSubmit != null
      ? {
          proctor_session_id: input.proctorSessionId ?? null,
          proctor_violations: input.proctorViolations ?? 0,
          proctor_auto_submit: input.proctorAutoSubmit ?? false,
        }
      : {};

  const payloads: Record<string, unknown>[] = [
    {
      ...base,
      ...proctorFields,
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
      !isMissingColumnError(error, 'test_id') &&
      !isMissingColumnError(error, 'proctor_violations') &&
      !isMissingColumnError(error, 'proctor_auto_submit') &&
      !isMissingColumnError(error, 'proctor_session_id')
    ) {
      const code = (error as { code?: string })?.code;
      if (code === '23503' || code === '22P02') continue;
      throw error;
    }
  }

  if (!attemptId) {
    throw lastError ?? new Error('Could not save test attempt');
  }

  try {
    await supabase
      .from('test_attempts')
      .update({ user_id: input.userId, status: 'completed' })
      .eq('id', attemptId);
  } catch {
    // non-fatal if legacy schema differs
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
  const plain = await supabase.from('test_attempts').select('*').eq('user_id', userId).limit(50);
  if (!plain.error && plain.data?.length) {
    return plain.data as AttemptRow[];
  }

  const attempts = async (orderCol: string) =>
    supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', userId)
      .order(orderCol, { ascending: false })
      .limit(50);

  for (const col of ['created_at', 'started_at', 'id']) {
    const res = await attempts(col);
    if (!res.error && res.data?.length) {
      return res.data as AttemptRow[];
    }
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

export function getClientDashboardAttempts(userId: string): DashboardAttemptView[] {
  const feed = getDashboardFeedAttempts(userId);
  const browser = getBrowserDashboardAttempts<DashboardAttemptView>(userId);
  return mergeAttempts(feed, browser);
}

const API_ATTEMPTS_CACHE_PREFIX = 'prepindia:api-attempts:';

function readCachedApiAttempts(userId: string): DashboardAttemptView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(`${API_ATTEMPTS_CACHE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as
      | DashboardAttemptView[]
      | { attempts?: DashboardAttemptView[]; attempt?: DashboardAttemptView };
    if (Array.isArray(parsed)) return parsed;
    if (parsed.attempts?.length) return parsed.attempts;
    if (parsed.attempt) return [parsed.attempt];
  } catch {
    return [];
  }
  return [];
}

export function cacheApiAttempts(userId: string, attempts: DashboardAttemptView[]): void {
  if (typeof window === 'undefined' || !attempts.length) return;
  try {
    window.sessionStorage.setItem(
      `${API_ATTEMPTS_CACHE_PREFIX}${userId}`,
      JSON.stringify(attempts.slice(0, 30)),
    );
  } catch {
    // ignore
  }
}

export async function fetchStudentDashboardAttempts(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardAttemptView[]> {
  const client = mergeAttempts(getClientDashboardAttempts(userId), readCachedApiAttempts(userId));

  let serverAttempts: DashboardAttemptView[] = [];

  try {
    serverAttempts = await fetchStudentDashboardStats(supabase, userId);
  } catch {
    // table may not exist yet
  }

  try {
    const authHeaders = await getSupabaseAuthHeaders(supabase);
    const res = await fetch('/api/student/test-attempts', {
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders,
    });
    if (res.ok) {
      const json = (await res.json()) as { attempts?: DashboardAttemptView[] };
      if (json.attempts?.length) {
        cacheApiAttempts(userId, json.attempts);
        serverAttempts = mergeAttempts(serverAttempts, json.attempts);
      }
    }
  } catch {
    // fall through
  }

  if (!serverAttempts.length) {
    serverAttempts = await fetchAttemptsForUser(supabase, userId);
  }

  return mergeAttempts(client, serverAttempts).slice(0, 15);
}

export type { DashboardStatEntry };

/** Local-only placeholder ids that get replaced once the server persists. */
function isPlaceholderId(id: string): boolean {
  return id.startsWith('local-') || id.startsWith('pending-');
}

/** Time bucket so a local-* and a server uuid for the same submission collapse. */
function dedupBucketKey(row: TestAttempt & { test: Test }): string {
  const testId = String(row.test_id ?? row.test?.id ?? '');
  const ts = new Date(row.completed_at ?? row.created_at ?? 0).getTime();
  if (!testId || !Number.isFinite(ts) || ts <= 0) return '';
  // 2-minute window — local + server saves for the same submission land here.
  const minute = Math.floor(ts / 120000);
  return `${testId}:${minute}`;
}

export function mergeAttempts<T extends TestAttempt & { test: Test }>(
  primary: T[],
  secondary: T[],
): T[] {
  const seenIds = new Set<string>();
  const byBucket = new Map<string, T>();
  const ordered: T[] = [];

  const add = (row: T) => {
    const id = String(row.id);
    if (seenIds.has(id)) return;
    const bucket = dedupBucketKey(row);
    if (bucket) {
      const existing = byBucket.get(bucket);
      if (existing) {
        const existingId = String(existing.id);
        const replace = isPlaceholderId(existingId) && !isPlaceholderId(id);
        if (replace) {
          // Drop the placeholder in favour of the real server row.
          seenIds.delete(existingId);
          const idx = ordered.findIndex((r) => String(r.id) === existingId);
          if (idx >= 0) ordered.splice(idx, 1);
        } else {
          return; // Keep the existing (non-placeholder) entry.
        }
      }
      byBucket.set(bucket, row);
    }
    seenIds.add(id);
    ordered.push(row);
  };

  for (const row of primary) add(row);
  for (const row of secondary) add(row);

  return ordered.sort(
    (a, b) =>
      new Date(b.created_at ?? b.completed_at ?? 0).getTime() -
      new Date(a.created_at ?? a.completed_at ?? 0).getTime(),
  );
}
