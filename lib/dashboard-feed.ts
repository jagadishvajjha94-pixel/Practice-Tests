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
  total_questions?: number;
};

const FEED_PREFIX = 'prepindia:dashboard-feed:';
export const GLOBAL_DASHBOARD_FEED_KEY = `${FEED_PREFIX}__latest__`;
export const LAST_SUBMIT_SESSION_KEY = 'prepindia:last-submit';

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

function writeFeedLists(userId: string, entry: DashboardFeedEntry): void {
  const key = feedKey(userId);
  const raw = window.localStorage.getItem(key);
  const list = raw ? (JSON.parse(raw) as DashboardFeedEntry[]) : [];
  const next = [entry, ...list.filter((row) => String(row.id) !== String(entry.id))].slice(0, 50);
  window.localStorage.setItem(key, JSON.stringify(next));
  window.localStorage.setItem(GLOBAL_DASHBOARD_FEED_KEY, JSON.stringify(entry));
  window.sessionStorage.setItem(LAST_SUBMIT_SESSION_KEY, JSON.stringify(entry));
  window.sessionStorage.setItem(feedKey(userId), JSON.stringify(next));
}

export function pushDashboardFeedEntry(userId: string, entry: DashboardFeedEntry): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    writeFeedLists(userId, entry);
  } catch {
    try {
      window.sessionStorage.setItem(GLOBAL_DASHBOARD_FEED_KEY, JSON.stringify(entry));
      window.sessionStorage.setItem(LAST_SUBMIT_SESSION_KEY, JSON.stringify(entry));
      window.sessionStorage.setItem(feedKey(userId), JSON.stringify([entry]));
    } catch {
      // private mode
    }
  }
}

/** Remove an entry from all feed surfaces (user list, last-submit, global). */
export function removeDashboardFeedEntry(userId: string, attemptId: string): void {
  if (typeof window === 'undefined' || !userId || !attemptId) return;
  const matches = (entry: DashboardFeedEntry | null) =>
    entry != null && String(entry.id) === String(attemptId);

  try {
    const key = feedKey(userId);
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw) as DashboardFeedEntry[];
      const next = list.filter((row) => String(row.id) !== String(attemptId));
      if (next.length) {
        window.localStorage.setItem(key, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }

  try {
    const sessionRaw = window.sessionStorage.getItem(feedKey(userId));
    if (sessionRaw) {
      const list = JSON.parse(sessionRaw) as DashboardFeedEntry[];
      const next = list.filter((row) => String(row.id) !== String(attemptId));
      if (next.length) {
        window.sessionStorage.setItem(feedKey(userId), JSON.stringify(next));
      } else {
        window.sessionStorage.removeItem(feedKey(userId));
      }
    }
  } catch {
    // ignore
  }

  try {
    const globalRaw = window.localStorage.getItem(GLOBAL_DASHBOARD_FEED_KEY);
    if (globalRaw && matches(JSON.parse(globalRaw) as DashboardFeedEntry)) {
      window.localStorage.removeItem(GLOBAL_DASHBOARD_FEED_KEY);
    }
    const lastRaw = window.sessionStorage.getItem(LAST_SUBMIT_SESSION_KEY);
    if (lastRaw && matches(JSON.parse(lastRaw) as DashboardFeedEntry)) {
      window.sessionStorage.removeItem(LAST_SUBMIT_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

export function getLastSubmitEntry(): DashboardFeedEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.sessionStorage.getItem(LAST_SUBMIT_SESSION_KEY) ??
      window.localStorage.getItem(GLOBAL_DASHBOARD_FEED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardFeedEntry;
  } catch {
    return null;
  }
}

export function scanAllDashboardFeedEntries(forUserId?: string): DashboardFeedEntry[] {
  if (typeof window === 'undefined') return [];
  const seen = new Set<string>();
  const out: DashboardFeedEntry[] = [];

  const push = (entry: DashboardFeedEntry | null) => {
    if (!entry?.id) return;
    if (forUserId && entry.user_id !== forUserId) return;
    const id = String(entry.id);
    if (seen.has(id)) return;
    seen.add(id);
    out.push(entry);
  };

  push(getLastSubmitEntry());

  try {
    const globalRaw = window.localStorage.getItem(GLOBAL_DASHBOARD_FEED_KEY);
    if (globalRaw) push(JSON.parse(globalRaw) as DashboardFeedEntry);
  } catch {
    // ignore
  }

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(FEED_PREFIX)) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const row of parsed) push(row as DashboardFeedEntry);
      } else {
        push(parsed as DashboardFeedEntry);
      }
    } catch {
      // ignore
    }
  }

  try {
    const sessionRaw = window.sessionStorage.getItem(
      forUserId ? feedKey(forUserId) : GLOBAL_DASHBOARD_FEED_KEY,
    );
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (Array.isArray(parsed)) {
        for (const row of parsed) push(row as DashboardFeedEntry);
      } else {
        push(parsed as DashboardFeedEntry);
      }
    }
  } catch {
    // ignore
  }

  return out;
}

export function getDashboardFeedEntries(userId: string): DashboardFeedEntry[] {
  if (typeof window === 'undefined' || !userId) return [];
  return scanAllDashboardFeedEntries(userId);
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
  totalQuestions?: number;
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
    total_questions: input.totalQuestions,
  };
}
