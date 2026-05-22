import { buildFeedEntry, pushDashboardFeedEntry } from '@/lib/dashboard-feed';
import { LOCAL_ATTEMPT_GUEST_USER_ID, saveLocalTestAttempt } from '@/lib/local-test-attempts';
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
  /** Stored on test_attempts.answers (e.g. ElevateX scorecard JSON). */
  answers?: Record<string, unknown>;
  proctorSessionId?: string;
  proctorViolations?: number;
  proctorAutoSubmit?: boolean;
  /** Minimal test row for local result / dashboard merge */
  test?: Pick<Test, 'id' | 'name' | 'category_id' | 'duration' | 'total_questions'>;
};

export type RecordDashboardAttemptResult = {
  attemptId: string;
  savedToServer: boolean;
  alreadyCompleted?: boolean;
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
  const test = minimalTest(input);

  if (!user) {
    const localAttemptId = `local-${input.examKind ?? 'practice'}-${Date.now()}`;
    const localPayload = {
      attempt: {
        id: localAttemptId,
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
    saveLocalTestAttempt(ownerId, localAttemptId, localPayload);
    pushDashboardFeedEntry(
      ownerId,
      buildFeedEntry({
        id: localAttemptId,
        userId: ownerId,
        testId: input.testId,
        testName: input.testName,
        scorePercent: input.scorePercent,
        elapsedSec,
        completedAtIso: nowIso,
      }),
    );
    return { attemptId: localAttemptId, savedToServer: false };
  }

  let savedToServer = false;
  let attemptId = `local-${input.examKind ?? 'practice'}-${Date.now()}`;

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
        answers: input.answers,
        proctorSessionId: input.proctorSessionId,
        proctorViolations: input.proctorViolations ?? 0,
        proctorAutoSubmit: input.proctorAutoSubmit ?? false,
      }),
    });

    if (res.status === 409) {
      const json = (await res.json()) as {
        attemptId?: string;
        priorAttempt?: { id?: string };
      };
      const priorId = String(json.attemptId ?? json.priorAttempt?.id ?? '').trim();
      if (priorId) {
        return { attemptId: priorId, savedToServer: true, alreadyCompleted: true };
      }
    }

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
      if (json.id) {
        attemptId = json.id;
        saveLocalTestAttempt(user.id, json.id, {
          attempt: {
            id: json.id,
            user_id: user.id,
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
      }
    }
  } catch {
    // fall through to local-only save
  }

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

  if (!savedToServer) {
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
  }

  return { attemptId, savedToServer };
}
