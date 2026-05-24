'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import type { FaceScanStatus } from '@/lib/exam-v2/face-detector';
import { PROCTOR_FACE_ABSENT_SEC } from '@/lib/exam-v2/proctoring-config';

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  violationCount: number;
  maxViolations: number;
  tabSwitchCount: number;
  cameraReady: boolean;
  cameraError: string | null;
  faceStatus: FaceScanStatus;
  autoSubmitTriggered: boolean;
  onEnterFullscreen: () => void;
  /** Fired when the portaled <video> mounts so the hook can attach an existing stream. */
  onVideoMount?: () => void;
};

const FACE_LABEL: Record<string, string> = {
  present: 'OK',
  absent: 'No face',
  multiple: 'Multi',
  suspicious: 'Adjust',
};

/** Floating proctor HUD — portaled to document.body so it sits outside the exam page layout. */
export function ExamProctorPanel({
  videoRef,
  violationCount,
  maxViolations,
  tabSwitchCount,
  cameraReady,
  cameraError,
  faceStatus,
  autoSubmitTriggered,
  onEnterFullscreen,
  onVideoMount,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const remaining = Math.max(0, maxViolations - violationCount);
  const warnTone =
    violationCount >= maxViolations - 1
      ? 'danger'
      : violationCount >= maxViolations - 3
        ? 'warning'
        : 'success';

  return createPortal(
    <>
      <div
        className="fixed top-[4.5rem] right-3 z-[200] w-[6.75rem] sm:w-[7.25rem] rounded-lg border border-slate-300/90 bg-white/95 shadow-md backdrop-blur-sm overflow-hidden pointer-events-auto"
        aria-label="Proctoring monitor"
      >
        <div className="px-2 py-1 bg-[#0c2340] text-white flex items-center justify-between gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide">Proctor</span>
          <Badge tone={cameraReady ? 'success' : 'danger'} className="text-[9px] px-1 py-0">
            {cameraReady ? 'On' : 'Off'}
          </Badge>
        </div>
        <div className="relative h-12 bg-slate-900">
          <video
            ref={(el) => {
              (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
              if (el) onVideoMount?.();
            }}
            className="h-full w-full object-cover scale-x-[-1]"
            playsInline
            muted
            aria-hidden
          />
          {!cameraReady ? (
            <div className="absolute inset-0 flex items-center justify-center px-1 text-center text-[8px] leading-tight text-slate-400">
              {cameraError ? 'No cam' : '…'}
            </div>
          ) : null}
        </div>
        <div className="px-2 py-1.5 space-y-0.5 text-[9px] leading-tight text-slate-600">
          <div className="flex justify-between gap-1">
            <span>Face</span>
            <span
              className={`font-semibold ${
                faceStatus === 'present'
                  ? 'text-emerald-700'
                  : faceStatus === 'absent'
                    ? 'text-red-700'
                    : 'text-amber-700'
              }`}
            >
              {FACE_LABEL[faceStatus] ?? faceStatus}
            </span>
          </div>
          <div className="flex justify-between gap-1">
            <span>Tabs</span>
            <span className="font-semibold tabular-nums text-slate-800">{tabSwitchCount}</span>
          </div>
          <div className="flex justify-between gap-1 items-center">
            <span>Flags</span>
            <Badge tone={warnTone} className="text-[9px] px-1 py-0 tabular-nums">
              {violationCount}/{maxViolations}
            </Badge>
          </div>
          <p className="text-[8px] text-slate-500">
            {remaining} left · face &gt;{PROCTOR_FACE_ABSENT_SEC}s
          </p>
          <button
            type="button"
            className="text-[8px] font-semibold text-[#1e3a5f] underline"
            onClick={onEnterFullscreen}
          >
            Fullscreen
          </button>
        </div>
      </div>

      {violationCount > 0 && !autoSubmitTriggered ? (
        <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-[190] max-w-md rounded-md border border-amber-200 bg-amber-50/95 px-3 py-1 text-center text-[11px] text-amber-900 shadow-sm pointer-events-none">
          Incident {violationCount}/{maxViolations} — stay on this tab, face visible.
        </div>
      ) : null}

      {autoSubmitTriggered ? (
        <div className="fixed inset-0 z-[220] overflow-y-auto overscroll-contain bg-black/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="rounded-xl bg-white p-6 max-w-md w-full text-center shadow-xl my-auto">
              <p className="text-lg font-bold text-[#0c2340]">Exam ending — policy limit reached</p>
              <p className="text-sm text-slate-600 mt-2">
                {maxViolations} proctoring incidents were recorded. Your answers are being submitted
                automatically.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
