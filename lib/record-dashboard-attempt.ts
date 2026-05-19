import {
  buildFeedEntry,
  pushDashboardFeedEntry,
  removeDashboardFeedEntry,
} from '@/lib/dashboard-feed';
import {
  LOCAL_ATTEMPT_GUEST_USER_ID,
  removeLocalTestAttempt,
  saveLocalTestAttempt,
} from '@/lib/local-test-attempts';
import { getSupabaseAuthHeaders } from '@/lib/supabase-auth-headers';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Test } from '@/lib/types';
import {
  cacheApiAttempts,
  type DashboardAttemptView,
} from '@/lib/test-attempts';

export type ExamKind = 'practice' | 'programming' | 'department' | 'competitive';

export type RecordDashboardAttemptInput = {
  testId: string;
  testName: string;
  scorePercent: number;
  rawNetScore?: number;
  elapsedSec?: number;
  examKind?: ExamKind;
  /** Minimal test row for local result / dashboard merge */
  test?: Pick<Test, 'id' | 'name' | 'category_id' | 'duration' | 'total_questions'>;
};

export type RecordDashboardAttemptResult = {
  attemptId: string;
  savedToServer: boolean;
};

function minimalTest(input: RecordDashboardAttemptInput): Test {
  const now = new Date().toISOString();
  return {
    id: input.test?.id ?? input.testId,
    name: input.testName,
    category_id: input.test?.category_id ?? '',
    duration: input.test?.duration ?? 0,
    total_questions: input.test?.total_questions ?? 0,
    passing_score: null,
    description: null,
    difficulty_level: null,
    is_paid: false,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Persist an exam attempt for the student dashboard (feed, API, optional local).
 */
export async function recordDashboardAttempt(
  input: RecordDashboardAttemptInput,
): Promise<RecordDashboardAttemptResult | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerId = user?.id ?? LOCAL_ATTEMPT_GUEST_USER_ID;
  const nowIso = new Date().toISOString();
  const elapsedSec = input.elapsedSec ?? 0;
  const localAttemptId = `local-${input.examKind ?? 'practice'}-${Date.now()}`;
  let attemptId = localAttemptId;

  const test = minimalTest(input);

  const localPayload = {
    attempt: {
      id: attemptId,
      user_id: ownerId,
      test_id: input.testId,
      started_at: nowIso,
      completed_at: nowIso,
      score: input.scorePercent,
      answers: null,
      time_taken: elapsedSec,
      status: 'completed' as const,
      created_at: nowIso,
    },
    test,
  };

  saveLocalTestAttempt(ownerId, attemptId, localPayload);
  pushDashboardFeedEntry(
    ownerId,
    buildFeedEntry({
      id: attemptId,
      userId: ownerId,
      testId: input.testId,
      testName: input.testName,
      scorePercent: input.scorePercent,
      elapsedSec,
      completedAtIso: nowIso,
    }),
  );

  if (!user) {
    return { attemptId, savedToServer: false };
  }

  let savedToServer = false;

  try {
    const authHeaders = await getSupabaseAuthHeaders(supabase);
    const res = await fetch('/api/student/test-attempts', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        testId: input.testId,
        testName: input.testName,
        scorePercent: input.scorePercent,
        rawNetScore: input.rawNetScore ?? input.scorePercent,
        elapsedSec,
        startedAtIso: nowIso,
        completedAtIso: nowIso,
        examKind: input.examKind,
      }),
    });

    if (res.ok) {
      savedToServer = true;
      const json = (await res.json()) as {
        id?: string;
        attempt?: DashboardAttemptView;
        attempts?: DashboardAttemptView[];
      };
      if (json.attempts?.length) {
        cacheApiAttempts(user.id, json.attempts);
      } else if (json.attempt) {
        cacheApiAttempts(user.id, [json.attempt]);
      }
      if (json.id && json.id !== localAttemptId) {
        saveLocalTestAttempt(user.id, json.id, {
          ...localPayload,
          attempt: { ...localPayload.attempt, id: json.id },
        });
        pushDashboardFeedEntry(
          user.id,
          buildFeedEntry({
            id: json.id,
            userId: user.id,
            testId: input.testId,
            testName: input.testName,
            scorePercent: input.scorePercent,
            elapsedSec,
            completedAtIso: nowIso,
          }),
        );
        // Drop the local placeholder so the dashboard doesn't show two rows.
        removeLocalTestAttempt(user.id, localAttemptId);
        removeDashboardFeedEntry(user.id, localAttemptId);
        attemptId = json.id;
      }
    }
  } catch {
    // feed + local still updated
  }

  return { attemptId, savedToServer };
}
