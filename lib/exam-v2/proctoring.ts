export type ExamViolationType =
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'copy_paste'
  | 'visibility_hidden'
  | 'multiple_monitors_suspected'
  | 'face_not_visible'
  | 'face_absent'
  | 'multiple_faces'
  | 'face_suspicious'
  | 'camera_denied'
  | 'auto_submit_violations';

export interface ExamViolationEvent {
  type: ExamViolationType;
  at: string;
  metadata?: Record<string, unknown>;
}

export function logExamViolation(
  sessionKey: string,
  event: Omit<ExamViolationEvent, 'at'> & { at?: string },
): ExamViolationEvent {
  const full: ExamViolationEvent = {
    ...event,
    at: event.at ?? new Date().toISOString(),
  };
  if (typeof window === 'undefined') return full;

  const key = `examViolations:${sessionKey}`;
  const prev = JSON.parse(sessionStorage.getItem(key) ?? '[]') as ExamViolationEvent[];
  prev.push(full);
  sessionStorage.setItem(key, JSON.stringify(prev.slice(-100)));
  return full;
}

export function getExamViolations(sessionKey: string): ExamViolationEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(`examViolations:${sessionKey}`) ?? '[]') as ExamViolationEvent[];
  } catch {
    return [];
  }
}

export function createProctorSessionId(testId: string, userId?: string): string {
  const uid = userId ?? 'guest';
  return `proctor-${testId}-${uid}-${Date.now()}`;
}
