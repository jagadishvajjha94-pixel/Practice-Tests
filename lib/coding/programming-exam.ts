/** Programming assessment duration (1 hour). */
export const PROGRAMMING_EXAM_DURATION_SECONDS = 60 * 60;

export const PROGRAMMING_EXAM_STORAGE_KEY = 'rce_programming_exam_end_at';

export function formatExamTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function readExamEndAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PROGRAMMING_EXAM_STORAGE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function startExamTimer(): number {
  const endAt = Date.now() + PROGRAMMING_EXAM_DURATION_SECONDS * 1000;
  sessionStorage.setItem(PROGRAMMING_EXAM_STORAGE_KEY, String(endAt));
  return endAt;
}

export function clearExamTimer(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PROGRAMMING_EXAM_STORAGE_KEY);
}

export function secondsRemaining(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}
