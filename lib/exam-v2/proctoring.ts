export type ExamViolationType =
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'copy_paste'
  | 'visibility_hidden'
  | 'multiple_monitors_suspected';

export interface ExamViolationEvent {
  type: ExamViolationType;
  at: string;
  metadata?: Record<string, unknown>;
}

export function logExamViolation(
  testId: string,
  event: Omit<ExamViolationEvent, 'at'> & { at?: string },
): ExamViolationEvent {
  const full: ExamViolationEvent = {
    ...event,
    at: event.at ?? new Date().toISOString(),
  };
  if (typeof window === 'undefined') return full;

  const key = `examViolations:${testId}`;
  const prev = JSON.parse(sessionStorage.getItem(key) ?? '[]') as ExamViolationEvent[];
  prev.push(full);
  sessionStorage.setItem(key, JSON.stringify(prev.slice(-50)));
  return full;
}

export function getExamViolations(testId: string): ExamViolationEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(`examViolations:${testId}`) ?? '[]') as ExamViolationEvent[];
  } catch {
    return [];
  }
}
