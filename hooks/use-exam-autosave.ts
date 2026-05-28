'use client';

import { useEffect, useRef } from 'react';
import type { TestAnswer } from '@/app/tests/take/[testId]/test-context';
import { saveExamDraft } from '@/lib/exam-v2/autosave';

type Options = {
  testId: string;
  attemptId?: string | null;
  enabled?: boolean;
  /** Local draft interval (sessionStorage). Default 30s — not every click. */
  localIntervalMs?: number;
  /** Server autosave interval. Default 3 minutes. */
  serverIntervalMs?: number;
  answers: Record<string, TestAnswer>;
  currentQuestionIndex: number;
  timeRemaining: number;
  isSubmitted: boolean;
};

export function useExamAutosave({
  testId,
  attemptId,
  enabled = true,
  localIntervalMs = 30_000,
  serverIntervalMs = 180_000,
  answers,
  currentQuestionIndex,
  timeRemaining,
  isSubmitted,
}: Options) {
  const snapshotRef = useRef({ answers, currentQuestionIndex, timeRemaining });
  const attemptIdRef = useRef(attemptId);
  const lastServerSaveRef = useRef(0);

  useEffect(() => {
    snapshotRef.current = { answers, currentQuestionIndex, timeRemaining };
  }, [answers, currentQuestionIndex, timeRemaining]);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  useEffect(() => {
    if (!enabled || isSubmitted) return;

    const saveLocal = () => {
      const s = snapshotRef.current;
      saveExamDraft({
        testId,
        answers: s.answers,
        currentQuestionIndex: s.currentQuestionIndex,
        timeRemaining: s.timeRemaining,
        savedAt: new Date().toISOString(),
      });
    };

    const saveServer = async () => {
      const id = attemptIdRef.current;
      if (!id || String(id).startsWith('local-')) return;

      const now = Date.now();
      if (now - lastServerSaveRef.current < serverIntervalMs - 5000) return;

      const s = snapshotRef.current;
      try {
        const res = await fetch(`/api/exam/attempts/${encodeURIComponent(String(id))}/autosave`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: s.answers,
            currentQuestionIndex: s.currentQuestionIndex,
            timeRemaining: s.timeRemaining,
          }),
          keepalive: true,
        });
        if (res.ok) {
          lastServerSaveRef.current = now;
        }
      } catch {
        /* best effort — local draft remains */
      }
    };

    saveLocal();
    const localId = window.setInterval(saveLocal, localIntervalMs);
    const serverId = window.setInterval(() => void saveServer(), serverIntervalMs);

    return () => {
      clearInterval(localId);
      clearInterval(serverId);
    };
  }, [testId, enabled, localIntervalMs, serverIntervalMs, isSubmitted]);
}
