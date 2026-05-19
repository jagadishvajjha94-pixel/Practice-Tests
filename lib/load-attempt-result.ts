import type { SupabaseClient } from '@supabase/supabase-js';
import type { Question, Test, TestAttempt } from '@/lib/types';
import { adaptQuestionRow, adaptTestRow, extractJoinedQuestion } from '@/lib/practice-mappers';
import { getDashboardFeedEntries, type DashboardFeedEntry } from '@/lib/dashboard-feed';
import {
  LOCAL_ATTEMPT_GUEST_USER_ID,
  loadLocalTestAttempt,
  type LocalTestAttemptPayload,
} from '@/lib/local-test-attempts';
import { PROGRAMMING_DASHBOARD_TEST_ID } from '@/lib/programming-dashboard';
import {
  fetchStudentDashboardStats,
  statEntryToAttempt,
} from '@/lib/student-dashboard-stats';
import { fallbackTestForAttempt, normalizeAttemptRow, type AttemptRow } from '@/lib/test-attempts';

export type LoadedAttemptResult = {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  answers: Record<string, unknown>;
  summaryOnly: boolean;
};

type AnswerRow = {
  question_id: unknown;
  user_answer?: unknown;
  userAnswer?: unknown;
  marked_for_review?: unknown;
};

function mergeRowsIntoAnswers(
  base: Record<string, unknown>,
  rows: AnswerRow[] | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  if (!rows?.length) return out;
  for (const row of rows) {
    const qid = String(row.question_id);
    const prev =
      out[qid] != null && typeof out[qid] === 'object'
        ? (out[qid] as Record<string, unknown>)
        : {};
    const ua = row.user_answer ?? row.userAnswer ?? prev.userAnswer;
    out[qid] = {
      ...prev,
      userAnswer: ua,
      isMarkedForReview: row.marked_for_review ?? prev.isMarkedForReview,
    };
  }
  return out;
}

function payloadToResult(parsed: LocalTestAttemptPayload): LoadedAttemptResult {
  const questions = (parsed.questions as Question[] | undefined) ?? [];
  const answers = (parsed.answers as Record<string, unknown> | undefined) ?? {};
  const hasDetail = questions.length > 0 && Object.keys(answers).length > 0;
  return {
    attempt: parsed.attempt,
    test: parsed.test,
    questions,
    answers,
    summaryOnly: !hasDetail,
  };
}

function feedEntryToResult(entry: DashboardFeedEntry): LoadedAttemptResult {
  const attempt = statEntryToAttempt({
    id: entry.id,
    user_id: entry.user_id,
    test_id: entry.test_id,
    test_name: entry.test_name,
    score: entry.score,
    status: entry.status,
    created_at: entry.created_at,
    completed_at: entry.completed_at,
    time_taken: entry.time_taken,
    total_questions: entry.total_questions,
  });
  return {
    attempt,
    test: attempt.test,
    questions: [],
    answers: {},
    summaryOnly: true,
  };
}

function syntheticTestFromRow(row: AttemptRow, title?: string, totalQuestions?: number): Test {
  const attempt = normalizeAttemptRow(row);
  const name = title ?? String((row as { test_title?: string }).test_title ?? 'Practice test');
  return {
    ...fallbackTestForAttempt(attempt),
    id: attempt.test_id || 'summary',
    name,
    total_questions: totalQuestions ?? 0,
  };
}

function findRichLocalPayload(userId: string, attemptId: string): LocalTestAttemptPayload | null {
  const direct = loadLocalTestAttempt(userId, attemptId);
  if (direct?.questions?.length && direct.answers && Object.keys(direct.answers).length) {
    return direct;
  }

  if (typeof window === 'undefined') return direct;

  const detailPrefix = `localTestAttemptDetail:${userId}:`;
  const mainPrefix = `localTestAttempt:${userId}:`;

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const isDetail = key.startsWith(detailPrefix) && key.endsWith(`:${attemptId}`);
    const isMain = key.startsWith(mainPrefix) && key.endsWith(`:${attemptId}`);
    if (!isDetail && !isMain) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as LocalTestAttemptPayload;
      if (String(parsed.attempt?.id) !== String(attemptId)) continue;
      if (parsed.questions?.length && parsed.answers) return parsed;
    } catch {
      // ignore
    }
  }

  return direct;
}

async function loadFromTestAttemptsTable(
  supabase: SupabaseClient,
  userId: string,
  attemptId: string,
): Promise<LoadedAttemptResult | null> {
  const { data: attempt, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !attempt) return null;

  const row = attempt as AttemptRow;
  const attemptNorm = normalizeAttemptRow(row);
  let test: Test | null = null;
  let questions: Question[] = [];

  if (row.test_id) {
    const { data: testRow } = await supabase
      .from('tests')
      .select('*')
      .eq('id', row.test_id)
      .maybeSingle();

    if (testRow) {
      test = adaptTestRow(testRow as Record<string, unknown>);

      const { data: testQuestions } = await supabase
        .from('test_questions')
        .select('question:questions(*)')
        .eq('test_id', test.id)
        .order('order', { ascending: true });

      questions = (testQuestions ?? [])
        .map(extractJoinedQuestion)
        .filter((q): q is Record<string, unknown> => q != null)
        .map(adaptQuestionRow);

      if (questions.length === 0) {
        const { data: directQs } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', row.test_id)
          .order('id', { ascending: true });
        if (directQs?.length) {
          questions = directQs.map((q) => adaptQuestionRow(q as Record<string, unknown>));
        }
      }
    }
  }

  if (!test) {
    test = syntheticTestFromRow(row);
  }

  let mergedAnswers: Record<string, unknown> =
    row.answers != null && typeof row.answers === 'object'
      ? { ...(row.answers as Record<string, unknown>) }
      : {};

  const { data: qaRows } = await supabase
    .from('question_answers')
    .select('question_id,user_answer,marked_for_review')
    .eq('attempt_id', attemptNorm.id);
  if (qaRows?.length) {
    mergedAnswers = mergeRowsIntoAnswers(mergedAnswers, qaRows as AnswerRow[]);
  }

  const { data: taRows } = await supabase
    .from('test_answers')
    .select('question_id,user_answer')
    .eq('attempt_id', attemptNorm.id);
  if (taRows?.length) {
    mergedAnswers = mergeRowsIntoAnswers(mergedAnswers, taRows as AnswerRow[]);
  }

  const hasDetail = questions.length > 0 && Object.keys(mergedAnswers).length > 0;

  return {
    attempt: attemptNorm,
    test,
    questions,
    answers: mergedAnswers,
    summaryOnly: !hasDetail,
  };
}

function countAttempted(answers: Record<string, unknown>): number {
  let n = 0;
  for (const value of Object.values(answers)) {
    if (value == null || typeof value !== 'object') continue;
    const ua = (value as { userAnswer?: unknown }).userAnswer;
    if (ua !== null && ua !== undefined && ua !== '') n += 1;
  }
  return n;
}

function richnessScore(result: LoadedAttemptResult): number {
  if (result.summaryOnly) return 0;
  // Per-question detail is most valuable; question count breaks ties.
  return countAttempted(result.answers) * 1000 + result.questions.length;
}

function pickRicher(
  a: LoadedAttemptResult | null,
  b: LoadedAttemptResult | null,
): LoadedAttemptResult | null {
  if (!a) return b;
  if (!b) return a;
  return richnessScore(b) > richnessScore(a) ? b : a;
}

export async function loadAttemptResult(
  supabase: SupabaseClient,
  attemptId: string,
  userId?: string,
): Promise<LoadedAttemptResult | null> {
  const ownerId = userId ?? LOCAL_ATTEMPT_GUEST_USER_ID;

  let best: LoadedAttemptResult | null = null;

  const localRich = findRichLocalPayload(ownerId, attemptId);
  if (localRich?.attempt && localRich.test) {
    best = pickRicher(best, payloadToResult(localRich));
  }

  if (userId) {
    const fromDb = await loadFromTestAttemptsTable(supabase, userId, attemptId);
    best = pickRicher(best, fromDb);

    for (const entry of getDashboardFeedEntries(userId)) {
      if (String(entry.id) === String(attemptId)) {
        best = pickRicher(best, feedEntryToResult(entry));
        break;
      }
    }

    const stats = await fetchStudentDashboardStats(supabase, userId);
    const fromStats = stats.find((row) => String(row.id) === String(attemptId));
    if (fromStats) {
      best = pickRicher(best, {
        attempt: fromStats,
        test: fromStats.test,
        questions: [],
        answers: {},
        summaryOnly: true,
      });
    }
  }

  if (!best && (attemptId.startsWith('local-') || attemptId.startsWith('pending-'))) {
    const guest = findRichLocalPayload(LOCAL_ATTEMPT_GUEST_USER_ID, attemptId);
    if (guest?.attempt && guest.test) {
      best = payloadToResult(guest);
    }
  }

  if (
    !best &&
    userId &&
    (attemptId.includes('programming') || attemptId.startsWith('local-programming'))
  ) {
    for (const entry of getDashboardFeedEntries(userId)) {
      if (
        String(entry.id) === String(attemptId) ||
        entry.test_id === PROGRAMMING_DASHBOARD_TEST_ID
      ) {
        best = feedEntryToResult(entry);
        break;
      }
    }
  }

  return best;
}
