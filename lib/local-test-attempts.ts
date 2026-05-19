import type { Test, TestAttempt } from '@/lib/types';

/** Guest / offline attempts before sign-in */
export const LOCAL_ATTEMPT_GUEST_USER_ID = 'guest';

export type LocalTestAttemptPayload = {
  attempt: TestAttempt;
  test: Test;
  questions?: unknown[];
  answers?: Record<string, unknown>;
};

const KEY_PREFIX = 'localTestAttempt:';
const DETAIL_PREFIX = 'localTestAttemptDetail:';
const INDEX_PREFIX = 'prepindia:attempts:';

function attemptIndexKey(userId: string): string {
  return `${INDEX_PREFIX}${userId}`;
}

function slimPayload(payload: LocalTestAttemptPayload): LocalTestAttemptPayload {
  return {
    attempt: {
      ...payload.attempt,
      answers: null,
    },
    test: payload.test,
  };
}

function writeStorage(key: string, payload: LocalTestAttemptPayload): void {
  try {
    const withoutQuestions = { ...payload, questions: undefined };
    window.localStorage.setItem(key, JSON.stringify(withoutQuestions));
  } catch {
    try {
      window.localStorage.setItem(key, JSON.stringify(slimPayload(payload)));
    } catch {
      // quota / private mode
    }
  }
}

/** Fast list for dashboard (sessionStorage survives same-tab navigation). */
export function appendAttemptIndex(
  userId: string,
  entry: TestAttempt & { test: Test },
): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = attemptIndexKey(userId);
    const raw = window.sessionStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as Array<TestAttempt & { test: Test }>) : [];
    const row: TestAttempt & { test: Test } = {
      id: entry.id,
      user_id: userId,
      test_id: entry.test_id,
      started_at: entry.started_at,
      completed_at: entry.completed_at,
      score: entry.score,
      answers: null,
      time_taken: entry.time_taken,
      status: entry.status ?? 'completed',
      created_at: entry.created_at,
      test: entry.test,
    };
    const next = [
      row,
      ...list.filter((a) => String(a.id) !== String(entry.id)),
    ].slice(0, 30);
    window.sessionStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function getAttemptIndexForUser<T extends TestAttempt & { test: Test }>(userId: string): T[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = window.sessionStorage.getItem(attemptIndexKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw) as T[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function localAttemptStorageKey(userId: string, attemptId: string): string {
  return `${KEY_PREFIX}${userId}:${attemptId}`;
}

function detailStorageKey(userId: string, attemptId: string): string {
  return `${DETAIL_PREFIX}${userId}:${attemptId}`;
}

export function saveLocalTestAttempt(
  userId: string,
  attemptId: string,
  payload: LocalTestAttemptPayload,
): void {
  if (typeof window === 'undefined') return;
  const scoped = {
    ...payload,
    attempt: {
      ...payload.attempt,
      id: attemptId,
      user_id: userId,
    },
  };
  writeStorage(localAttemptStorageKey(userId, attemptId), scoped);

  if (payload.questions?.length || payload.answers) {
    try {
      window.localStorage.setItem(detailStorageKey(userId, attemptId), JSON.stringify(scoped));
    } catch {
      // optional detail for result review
    }
  }

  appendAttemptIndex(userId, { ...scoped.attempt, test: scoped.test });
}

export function loadLocalTestAttempt(
  userId: string,
  attemptId: string,
): LocalTestAttemptPayload | null {
  if (typeof window === 'undefined') return null;

  const detailRaw = window.localStorage.getItem(detailStorageKey(userId, attemptId));
  if (detailRaw) {
    try {
      return JSON.parse(detailRaw) as LocalTestAttemptPayload;
    } catch {
      // fall through
    }
  }

  const scopedRaw = window.localStorage.getItem(localAttemptStorageKey(userId, attemptId));
  if (scopedRaw) {
    try {
      return JSON.parse(scopedRaw) as LocalTestAttemptPayload;
    } catch {
      return null;
    }
  }

  // Legacy key: localTestAttempt:local-<timestamp> (no user segment)
  const legacyKey = `${KEY_PREFIX}${attemptId}`;
  const legacyRaw = window.localStorage.getItem(legacyKey);
  if (!legacyRaw) return null;

  try {
    const parsed = JSON.parse(legacyRaw) as LocalTestAttemptPayload;
    const owner = parsed.attempt?.user_id;
    if (owner && owner !== userId && owner !== LOCAL_ATTEMPT_GUEST_USER_ID) {
      return null;
    }
    if (owner === LOCAL_ATTEMPT_GUEST_USER_ID && userId !== LOCAL_ATTEMPT_GUEST_USER_ID) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Remove a saved attempt (main + detail + session index) for the given user. */
export function removeLocalTestAttempt(userId: string, attemptId: string): void {
  if (typeof window === 'undefined' || !userId || !attemptId) return;
  try {
    window.localStorage.removeItem(localAttemptStorageKey(userId, attemptId));
    window.localStorage.removeItem(detailStorageKey(userId, attemptId));
    // Legacy unscoped key
    window.localStorage.removeItem(`${KEY_PREFIX}${attemptId}`);

    const idxKey = attemptIndexKey(userId);
    const raw = window.sessionStorage.getItem(idxKey);
    if (raw) {
      const list = JSON.parse(raw) as Array<TestAttempt & { test: Test }>;
      const next = list.filter((row) => String(row.id) !== String(attemptId));
      window.sessionStorage.setItem(idxKey, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
}

export function getLocalAttemptsForUser<T extends TestAttempt & { test: Test }>(
  userId: string,
): T[] {
  if (typeof window === 'undefined' || !userId) return [];
  const out: T[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    if (key.startsWith(DETAIL_PREFIX)) continue;

    const scopedPrefix = `${KEY_PREFIX}${userId}:`;
    const guestPrefix = `${KEY_PREFIX}${LOCAL_ATTEMPT_GUEST_USER_ID}:`;
    const isScoped = key.startsWith(scopedPrefix);
    const isGuestForUser =
      userId !== LOCAL_ATTEMPT_GUEST_USER_ID && key.startsWith(guestPrefix);
    const isLegacy = !key.slice(KEY_PREFIX.length).includes(':');

    if (!isScoped && !isLegacy && !isGuestForUser) continue;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as LocalTestAttemptPayload;
      if (!parsed.attempt || !parsed.test) continue;

      const owner = parsed.attempt.user_id;
      if (owner && owner !== userId && owner !== LOCAL_ATTEMPT_GUEST_USER_ID) continue;
      if (!owner && !isScoped) continue;

      const id = String(parsed.attempt.id ?? key.split(':').pop() ?? key);
      if (seen.has(id)) continue;
      seen.add(id);

      out.push({
        ...parsed.attempt,
        id,
        user_id: userId,
        test: parsed.test,
      } as T);
    } catch {
      // Ignore malformed payloads.
    }
  }

  return out.sort(
    (a, b) =>
      new Date(b.created_at ?? b.completed_at ?? 0).getTime() -
      new Date(a.created_at ?? a.completed_at ?? 0).getTime(),
  );
}

/** Synchronous snapshot for dashboard — never throws. */
export function getBrowserDashboardAttempts<T extends TestAttempt & { test: Test }>(
  userId: string,
): T[] {
  const local = getLocalAttemptsForUser<T>(userId);
  const indexed = getAttemptIndexForUser<T>(userId);
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const row of [...indexed, ...local]) {
    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(row);
  }
  return merged.sort(
    (a, b) =>
      new Date(b.created_at ?? b.completed_at ?? 0).getTime() -
      new Date(a.created_at ?? a.completed_at ?? 0).getTime(),
  );
}
