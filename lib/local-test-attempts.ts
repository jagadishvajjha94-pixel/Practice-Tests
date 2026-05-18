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
    const isScoped = key.startsWith(scopedPrefix);
    const isLegacy = !key.slice(KEY_PREFIX.length).includes(':');

    if (!isScoped && !isLegacy) continue;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as LocalTestAttemptPayload;
      if (!parsed.attempt || !parsed.test) continue;

      const owner = parsed.attempt.user_id;
      if (owner && owner !== userId) continue;
      if (!owner && !isScoped) continue;
      if (owner === LOCAL_ATTEMPT_GUEST_USER_ID && userId !== LOCAL_ATTEMPT_GUEST_USER_ID) {
        continue;
      }

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
