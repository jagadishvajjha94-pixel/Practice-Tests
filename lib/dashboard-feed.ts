import type { Test, TestAttempt } from '@/lib/types';

export type DashboardFeedEntry = {
  id: string;
  user_id: string;
  test_id: string;
  test_name: string;
  score: number;
  status: TestAttempt['status'];
  created_at: string;
  completed_at: string | null;
  time_taken: number | null;
};

const FEED_PREFIX = 'prepindia:dashboard-feed:';

function feedKey(userId: string): string {
  return `${FEED_PREFIX}${userId}`;
}

export function toDashboardAttemptFromFeed(entry: DashboardFeedEntry): TestAttempt & { test: Test } {
  const test: Test = {
    id: entry.test_id,
    name: entry.test_name,
    category_id: '',
    duration: 0,
    total_questions: 0,
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

export function pushDashboardFeedEntry(userId: string, entry: DashboardFeedEntry): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = feedKey(userId);
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as DashboardFeedEntry[]) : [];
    const next = [
      entry,
      ...list.filter((row) => String(row.id) !== String(entry.id)),
    ].slice(0, 50);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    try {
      window.sessionStorage.setItem(feedKey(userId), JSON.stringify([entry]));
    } catch {
      // private mode
    }
  }
}

export function getDashboardFeedEntries(userId: string): DashboardFeedEntry[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw =
      window.localStorage.getItem(feedKey(userId)) ??
      window.sessionStorage.getItem(feedKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw) as DashboardFeedEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getDashboardFeedAttempts(userId: string): Array<TestAttempt & { test: Test }> {
  return getDashboardFeedEntries(userId).map(toDashboardAttemptFromFeed);
}

export function buildFeedEntry(input: {
  id: string;
  userId: string;
  testId: string;
  testName: string;
  scorePercent: number;
  elapsedSec?: number;
  completedAtIso?: string;
}): DashboardFeedEntry {
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
  };
}
