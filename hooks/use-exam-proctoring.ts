'use client';

import { useCallback, useEffect, useState } from 'react';
import { logExamViolation, type ExamViolationEvent } from '@/lib/exam-v2/proctoring';

type Options = {
  testId: string;
  enabled?: boolean;
  requireFullscreen?: boolean;
  onViolation?: (event: ExamViolationEvent) => void;
};

export function useExamProctoring({
  testId,
  enabled = true,
  requireFullscreen = false,
  onViolation,
}: Options) {
  const [violations, setViolations] = useState<ExamViolationEvent[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const record = useCallback(
    (type: ExamViolationEvent['type'], metadata?: Record<string, unknown>) => {
      const event = logExamViolation(testId, { type, metadata });
      setViolations((prev) => [...prev, event]);
      if (type === 'tab_switch' || type === 'visibility_hidden') {
        setTabSwitchCount((c) => c + 1);
      }
      onViolation?.(event);
      void fetch('/api/v2/proctor/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, type, metadata }),
      }).catch(() => {});
    },
    [testId, onViolation],
  );

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const onVisibility = () => {
      if (document.hidden) record('visibility_hidden');
    };
    const onBlur = () => record('tab_switch', { reason: 'window_blur' });
    const onFullscreen = () => {
      if (requireFullscreen && !document.fullscreenElement) {
        record('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [enabled, requireFullscreen, record]);

  const enterFullscreen = useCallback(async () => {
    if (!document.documentElement.requestFullscreen) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* user denied */
    }
  }, []);

  return { violations, tabSwitchCount, enterFullscreen, recordViolation: record };
}
