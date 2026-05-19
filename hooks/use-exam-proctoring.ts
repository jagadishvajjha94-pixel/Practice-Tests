'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PROCTOR_FOCUS_DEBOUNCE_MS,
  PROCTOR_INGEST_FLUSH_MS,
  PROCTOR_MAX_VIOLATIONS,
} from '@/lib/exam-v2/proctoring-config';
import {
  logExamViolation,
  getExamViolations,
  type ExamViolationEvent,
  type ExamViolationType,
} from '@/lib/exam-v2/proctoring';
import { useCameraProctoring } from '@/hooks/use-camera-proctoring';

type Options = {
  testId: string;
  sessionId: string;
  enabled?: boolean;
  requireCamera?: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onMaxViolations?: (summary: { violationCount: number; violations: ExamViolationEvent[] }) => void;
};

const COUNTABLE_VIOLATIONS = new Set<ExamViolationType>([
  'tab_switch',
  'visibility_hidden',
  'face_absent',
  'multiple_faces',
  'face_suspicious',
  'face_not_visible',
  'copy_paste',
  'fullscreen_exit',
]);

export function useExamProctoring({
  testId,
  sessionId,
  enabled = true,
  requireCamera = true,
  videoRef,
  onMaxViolations,
}: Options) {
  const [violations, setViolations] = useState<ExamViolationEvent[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);

  const ingestQueueRef = useRef<Array<{ type: string; metadata?: Record<string, unknown> }>>([]);
  const flushTimerRef = useRef<number | null>(null);
  const lastFocusViolationRef = useRef(0);
  const autoSubmitRef = useRef(false);
  const maxViolationsRef = useRef(onMaxViolations);
  maxViolationsRef.current = onMaxViolations;

  const flushIngest = useCallback(async () => {
    const batch = ingestQueueRef.current.splice(0, ingestQueueRef.current.length);
    if (!batch.length) return;

    try {
      await fetch('/api/v2/proctor/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          sessionId,
          batch,
        }),
        keepalive: true,
      });
    } catch {
      /* best effort */
    }
  }, [testId, sessionId]);

  const scheduleIngest = useCallback(
    (type: string, metadata?: Record<string, unknown>) => {
      ingestQueueRef.current.push({
        type,
        metadata: { ...(metadata ?? {}), sessionId },
      });
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        void flushIngest();
      }, PROCTOR_INGEST_FLUSH_MS);
    },
    [flushIngest],
  );

  const recordViolation = useCallback(
    (type: ExamViolationType, metadata?: Record<string, unknown>, options?: { countable?: boolean }) => {
      if (!enabled || autoSubmitRef.current) return;

      const event = logExamViolation(sessionId, { type, metadata });
      setViolations((prev) => [...prev, event]);

      const countable = options?.countable ?? COUNTABLE_VIOLATIONS.has(type);
      if (!countable) {
        scheduleIngest(type, metadata);
        return;
      }

      setViolationCount((prev) => {
        const next = prev + 1;
        if (type === 'tab_switch' || type === 'visibility_hidden') {
          setTabSwitchCount((c) => c + 1);
        }
        scheduleIngest(type, { ...metadata, violationIndex: next });

        if (next >= PROCTOR_MAX_VIOLATIONS && !autoSubmitRef.current) {
          autoSubmitRef.current = true;
          setAutoSubmitTriggered(true);
          logExamViolation(sessionId, {
            type: 'auto_submit_violations',
            metadata: { violationCount: next },
          });
          scheduleIngest('auto_submit_violations', { violationCount: next });
          void flushIngest();
          maxViolationsRef.current?.({
            violationCount: next,
            violations: getExamViolations(sessionId),
          });
        }
        return next;
      });
    },
    [enabled, sessionId, scheduleIngest, flushIngest],
  );

  const onFaceViolation = useCallback(
    (type: 'face_absent' | 'multiple_faces' | 'face_suspicious', metadata?: Record<string, unknown>) => {
      recordViolation(type, metadata);
    },
    [recordViolation],
  );

  const { cameraReady, cameraError, faceStatus, startCamera, stopCamera } = useCameraProctoring({
    enabled: enabled && requireCamera,
    videoRef,
    onFaceViolation,
  });

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const recordFocusLoss = (type: ExamViolationType, metadata?: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastFocusViolationRef.current < PROCTOR_FOCUS_DEBOUNCE_MS) return;
      lastFocusViolationRef.current = now;
      recordViolation(type, metadata);
    };

    const onVisibility = () => {
      if (document.hidden) recordFocusLoss('visibility_hidden');
    };
    const onBlur = () => recordFocusLoss('tab_switch', { reason: 'window_blur' });
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('copy_paste', { action: 'copy' });
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('copy_paste', { action: 'paste' });
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      if (flushTimerRef.current != null) {
        clearTimeout(flushTimerRef.current);
      }
      void flushIngest();
    };
  }, [enabled, recordViolation, flushIngest]);

  const enterFullscreen = useCallback(async () => {
    if (!document.documentElement.requestFullscreen) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* user denied */
    }
  }, []);

  return {
    violations,
    violationCount,
    tabSwitchCount,
    autoSubmitTriggered,
    cameraReady,
    cameraError,
    faceStatus,
    startCamera,
    stopCamera,
    enterFullscreen,
    recordViolation,
    maxViolations: PROCTOR_MAX_VIOLATIONS,
  };
}
