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
  type DashboardStatEntry,
} from '@/lib/student-dashboard-stats';
import { fallbackTestForAttempt, normalizeAttemptRow, type AttemptRow } from '@/lib/test-attempts';

export type LoadedAttemptResult = {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  answers: Record<string, unknown>;
  summaryOnly: boolean;
};

function payloadToResult(parsed: LocalTestAttemptPayload, summaryOnly: boolean): LoadedAttemptResult {
  return {
    attempt: parsed.attempt,
    test: parsed.test,
    questions: (parsed.questions as Question[] | undefined) ?? [],
    answers: (parsed.answers as Record<string, unknown> | undefined) ?? {},
    summaryOnly: summaryOnly || !(parsed.questions?.length),
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
  });
  return {
    attempt,
    test: attempt.test,
    questions: [],
    answers: {},
    summaryOnly: true,
  };
}

function syntheticTestFromRow(row: AttemptRow, title?: string): Test {
  const attempt = normalizeAttemptRow(row);
  const name =
    title ?? String((row as { test_title?: string }).test_title ?? 'Practice test');
  return {
    ...fallbackTestForAttempt(attempt),
    id: attempt.test_id || 'summary',
    name,
  };
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

  const baseAnswers =
    row.answers != null && typeof row.answers === 'object'
      ? (row.answers as Record<string, unknown>)
      : {};

  return {
    attempt: attemptNorm,
    test,
    questions,
    answers: baseAnswers,
    summaryOnly: questions.length === 0 || !Object.keys(baseAnswers).length,
  };
}

export async function loadAttemptResult(
  supabase: SupabaseClient,
  attemptId: string,
  userId?: string,
): Promise<LoadedAttemptResult | null> {
  const ownerId = userId ?? LOCAL_ATTEMPT_GUEST_USER_ID;

  const local = loadLocalTestAttempt(ownerId, attemptId);
  if (local?.attempt && local.test) {
    const hasQuestions = Boolean(local.questions?.length);
    return payloadToResult(local, !hasQuestions);
  }

  if (typeof window !== 'undefined' && userId) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.includes(`:${attemptId}`)) continue;
      if (!key.includes(userId)) continue;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as LocalTestAttemptPayload;
        if (String(parsed.attempt?.id) === String(attemptId) && parsed.test) {
          return payloadToResult(parsed, !parsed.questions?.length);
        }
      } catch {
        // ignore
      }
    }
  }

  if (userId) {
    for (const entry of getDashboardFeedEntries(userId)) {
      if (String(entry.id) === String(attemptId)) {
        return feedEntryToResult(entry);
      }
    }

    const stats = await fetchStudentDashboardStats(supabase, userId);
    const fromStats = stats.find((row) => String(row.id) === String(attemptId));
    if (fromStats) {
      return {
        attempt: fromStats,
        test: fromStats.test,
        questions: [],
        answers: {},
        summaryOnly: true,
      };
    }

    const fromDb = await loadFromTestAttemptsTable(supabase, userId, attemptId);
    if (fromDb) return fromDb;
  }

  if (attemptId.startsWith('local-') || attemptId.startsWith('pending-')) {
    const guest = loadLocalTestAttempt(LOCAL_ATTEMPT_GUEST_USER_ID, attemptId);
    if (guest?.attempt && guest.test) {
      return payloadToResult(guest, !guest.questions?.length);
    }
  }

  if (
    userId &&
    (attemptId.includes('programming') || attemptId.startsWith('local-programming'))
  ) {
    for (const entry of getDashboardFeedEntries(userId)) {
      if (
        String(entry.id) === String(attemptId) ||
        entry.test_id === PROGRAMMING_DASHBOARD_TEST_ID
      ) {
        return feedEntryToResult(entry);
      }
    }
  }

  return null;
}
