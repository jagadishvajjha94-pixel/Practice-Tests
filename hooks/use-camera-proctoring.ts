'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { scanVideoFrame, type FaceScanStatus } from '@/lib/exam-v2/face-detector';
import {
  PROCTOR_FACE_ABSENT_SEC,
  PROCTOR_FACE_CHECK_MS,
  PROCTOR_SUSPICIOUS_DEBOUNCE_MS,
} from '@/lib/exam-v2/proctoring-config';

type Options = {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onFaceViolation: (
    type: 'face_absent' | 'multiple_faces' | 'face_suspicious',
    metadata?: Record<string, unknown>,
  ) => void;
};

export function useCameraProctoring({ enabled, videoRef, onFaceViolation }: Options) {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceScanStatus>('absent');
  const streamRef = useRef<MediaStream | null>(null);
  const absentSinceRef = useRef<number | null>(null);
  const absentViolationSentRef = useRef(false);
  const lastSuspiciousRef = useRef(0);
  const scanningRef = useRef(false);
  const onFaceViolationRef = useRef(onFaceViolation);
  onFaceViolationRef.current = onFaceViolation;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setCameraReady(false);
    setFaceStatus('absent');
  }, [videoRef]);

  const attachStreamToVideo = useCallback(async (): Promise<boolean> => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return false;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
    }

    try {
      if (video.paused) await video.play();
      setCameraReady(true);
      setCameraError(null);
      return true;
    } catch {
      return false;
    }
  }, [videoRef]);

  const startCamera = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.');
      setCameraReady(false);
      return false;
    }

    try {
      if (streamRef.current) {
        return attachStreamToVideo();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 15, max: 15 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (await attachStreamToVideo()) return true;

      // Video element may mount later (e.g. portaled proctor panel) — stream kept in streamRef.
      setCameraError(null);
      return true;
    } catch {
      setCameraError(
        'Camera access is required for proctored exams. Allow camera permission and retry.',
      );
      setCameraReady(false);
      return false;
    }
  }, [attachStreamToVideo]);

  // Start/stop camera with proctoring enabled (single lifecycle — no stop on cameraReady flip).
  useEffect(() => {
    if (!enabled) {
      stopCamera();
      return;
    }
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera]);

  // Re-bind when the <video> mounts after getUserMedia (portal / deferred render).
  useEffect(() => {
    if (!enabled || !streamRef.current) return;

    let cancelled = false;
    let tries = 0;
    const maxTries = 40;

    const attemptBind = async () => {
      if (cancelled) return;
      tries += 1;
      const ok = await attachStreamToVideo();
      if (ok || cancelled || tries >= maxTries) return;
      window.setTimeout(() => void attemptBind(), 150);
    };

    void attemptBind();
    return () => {
      cancelled = true;
    };
  }, [enabled, attachStreamToVideo]);

  // Face scan loop — must not call stopCamera on cleanup (was turning camera "Off" after start).
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || scanningRef.current) return;
      const video = videoRef.current;
      if (!video || !streamRef.current || video.readyState < 2) return;

      scanningRef.current = true;
      try {
        const result = await scanVideoFrame(video);
        setFaceStatus(result.status);

        const now = Date.now();

        if (result.status === 'present') {
          absentSinceRef.current = null;
          absentViolationSentRef.current = false;
        } else if (result.status === 'absent') {
          if (absentSinceRef.current == null) absentSinceRef.current = now;
          const absentMs = now - absentSinceRef.current;
          if (absentMs >= PROCTOR_FACE_ABSENT_SEC * 1000 && !absentViolationSentRef.current) {
            absentViolationSentRef.current = true;
            onFaceViolationRef.current('face_absent', { absentSeconds: PROCTOR_FACE_ABSENT_SEC });
          }
        } else if (result.status === 'multiple') {
          if (now - lastSuspiciousRef.current >= PROCTOR_SUSPICIOUS_DEBOUNCE_MS) {
            lastSuspiciousRef.current = now;
            onFaceViolationRef.current('multiple_faces');
          }
        } else if (result.status === 'suspicious') {
          if (now - lastSuspiciousRef.current >= PROCTOR_SUSPICIOUS_DEBOUNCE_MS) {
            lastSuspiciousRef.current = now;
            onFaceViolationRef.current('face_suspicious', {
              reason: 'poor_framing_or_position',
            });
          }
        }
      } finally {
        scanningRef.current = false;
      }
    };

    const id = window.setInterval(() => void tick(), PROCTOR_FACE_CHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, videoRef]);

  return {
    cameraReady,
    cameraError,
    faceStatus,
    startCamera,
    stopCamera,
  };
}
