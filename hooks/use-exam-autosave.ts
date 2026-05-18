'use client';

import { useEffect, useRef } from 'react';
import type { TestAnswer } from '@/app/tests/take/[testId]/test-context';
import { saveExamDraft } from '@/lib/exam-v2/autosave';

type Options = {
  testId: string;
  enabled?: boolean;
  intervalMs?: number;
  answers: Record<string, TestAnswer>;
  currentQuestionIndex: number;
  timeRemaining: number;
  isSubmitted: boolean;
};

export function useExamAutosave({
  testId,
  enabled = true,
  intervalMs = 5000,
  answers,
  currentQuestionIndex,
  timeRemaining,
  isSubmitted,
}: Options) {
  const snapshotRef = useRef({ answers, currentQuestionIndex, timeRemaining });

  useEffect(() => {
    snapshotRef.current = { answers, currentQuestionIndex, timeRemaining };
  }, [answers, currentQuestionIndex, timeRemaining]);

  useEffect(() => {
    if (!enabled || isSubmitted) return;

    const tick = () => {
      const s = snapshotRef.current;
      saveExamDraft({
        testId,
        answers: s.answers,
        currentQuestionIndex: s.currentQuestionIndex,
        timeRemaining: s.timeRemaining,
        savedAt: new Date().toISOString(),
      });
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [testId, enabled, intervalMs, isSubmitted]);
}
