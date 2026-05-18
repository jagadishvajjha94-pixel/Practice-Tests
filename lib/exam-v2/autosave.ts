import type { TestAnswer } from '@/app/tests/take/[testId]/test-context';

export interface ExamAutosavePayload {
  testId: string;
  answers: Record<string, TestAnswer>;
  currentQuestionIndex: number;
  timeRemaining: number;
  savedAt: string;
}

export function saveExamDraft(payload: ExamAutosavePayload): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`examDraft:${payload.testId}`, JSON.stringify(payload));
}

export function loadExamDraft(testId: string): ExamAutosavePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`examDraft:${testId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ExamAutosavePayload;
  } catch {
    return null;
  }
}

export function clearExamDraft(testId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`examDraft:${testId}`);
}
