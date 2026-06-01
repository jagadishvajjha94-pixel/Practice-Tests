import type { DbServiceClient } from '@/lib/db/get-db-service';
import {
  isElevateXAttemptMeta,
  parseElevateXScorecardFromAnswers,
} from '@/lib/placement/scorecard-payload';
import type { PlacementScorecard } from '@/lib/placement/types';
import {
  fetchDashboardStatEntries,
  findDashboardStatEntryByAttemptId,
} from '@/lib/student-dashboard-stats';
import { fetchTestAttemptById, isPlaceholderAttemptId } from '@/lib/test-attempts';

export type ElevateXScorecardLookupResult =
  | { scorecard: PlacementScorecard; attemptId: string; userId: string }
  | { error: string; status: number };

function scorecardFromStatEntry(entry: {
  id: string;
  user_id: string;
  test_id: string;
  test_name: string;
  answers?: unknown;
}): ElevateXScorecardLookupResult | null {
  if (!isElevateXAttemptMeta(entry.test_id, entry.test_name)) {
    return { error: 'Not an ElevateX attempt', status: 400 };
  }

  const scorecard = parseElevateXScorecardFromAnswers(entry.answers);
  if (!scorecard) return null;

  return {
    scorecard,
    attemptId: String(entry.id),
    userId: String(entry.user_id),
  };
}

export async function fetchElevateXScorecardForAttempt(
  db: DbServiceClient,
  attemptId: string,
  options?: { userId?: string },
): Promise<ElevateXScorecardLookupResult> {
  if (!isPlaceholderAttemptId(attemptId)) {
    const { row, error } = await fetchTestAttemptById(db, attemptId);
    if (error) {
      return { error: error.message, status: 500 };
    }
    if (row) {
      const testTitle = String(row.test_title ?? '');
      const testId = String(row.test_id ?? '');
      if (!isElevateXAttemptMeta(testId, testTitle)) {
        return { error: 'Not an ElevateX attempt', status: 400 };
      }
      const scorecard = parseElevateXScorecardFromAnswers(row.answers);
      if (scorecard) {
        return {
          scorecard,
          attemptId: String(row.id),
          userId: String(row.user_id ?? ''),
        };
      }
    }
  }

  const userId = options?.userId?.trim();
  if (userId) {
    const entries = await fetchDashboardStatEntries(db, userId);
    const entry = entries.find((row) => String(row.id) === attemptId);
    if (entry) {
      const fromStats = scorecardFromStatEntry(entry);
      if (fromStats) return fromStats;
    }
  } else {
    const located = await findDashboardStatEntryByAttemptId(db, attemptId);
    if (located) {
      const fromStats = scorecardFromStatEntry(located.entry);
      if (fromStats) {
        return { ...fromStats, userId: located.userId };
      }
    }
  }

  return {
    error:
      'ElevateX scorecard is not stored for this attempt. If you just finished the exam, refresh once. Otherwise open the result on the same browser you used to submit, or ask the exam cell for your report.',
    status: 404,
  };
}
