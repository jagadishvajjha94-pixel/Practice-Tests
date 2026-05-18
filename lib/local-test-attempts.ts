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
const INDEX_PREFIX = 'prepindia:attempts:';

function attemptIndexKey(userId: string): string {
  return `${INDEX_PREFIX}${userId}`;
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
    const next = [
      { ...entry, user_id: userId },
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
  window.localStorage.setItem(localAttemptStorageKey(userId, attemptId), JSON.stringify(scoped));
  appendAttemptIndex(userId, { ...scoped.attempt, test: scoped.test });
}

export function loadLocalTestAttempt(
  userId: string,
  attemptId: string,
): LocalTestAttemptPayload | null {
  if (typeof window === 'undefined') return null;

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

export function getLocalAttemptsForUser<T extends TestAttempt & { test: Test }>(
  userId: string,
): T[] {
  if (typeof window === 'undefined' || !userId) return [];
  const out: T[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;

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
