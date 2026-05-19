'use client';

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
};

const FACE_LABEL: Record<string, string> = {
  present: 'Face OK',
  absent: 'Face not visible',
  multiple: 'Multiple faces',
  suspicious: 'Adjust camera',
};

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
}: Props) {
  const remaining = Math.max(0, maxViolations - violationCount);
  const warnTone =
    violationCount >= maxViolations - 1
      ? 'danger'
      : violationCount >= maxViolations - 3
        ? 'warning'
        : 'success';

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 w-[11.5rem] sm:w-[13rem] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
        <div className="px-3 py-2 bg-[#0c2340] text-white flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">Proctor live</span>
          <Badge tone={cameraReady ? 'success' : 'danger'} className="text-[10px]">
            {cameraReady ? 'Cam on' : 'Cam off'}
          </Badge>
        </div>
        <div className="relative aspect-[4/3] bg-slate-900">
          <video
            ref={videoRef}
            className="h-full w-full object-cover scale-x-[-1]"
            playsInline
            muted
            aria-label="Proctor camera preview"
          />
          {!cameraReady ? (
            <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[10px] text-slate-300">
              {cameraError ?? 'Starting camera…'}
            </div>
          ) : null}
        </div>
        <div className="px-3 py-2 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Face</span>
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Tab switches</span>
            <span className="font-semibold tabular-nums text-slate-800">{tabSwitchCount}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Incidents</span>
            <Badge tone={warnTone} className="tabular-nums">
              {violationCount}/{maxViolations}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            Stay in frame. Leaving camera &gt;{PROCTOR_FACE_ABSENT_SEC}s counts as an incident.{' '}
            {remaining} left before auto-submit.
          </p>
          <button
            type="button"
            className="text-[10px] font-semibold text-[#1e3a5f] underline"
            onClick={onEnterFullscreen}
          >
            Enter fullscreen
          </button>
        </div>
      </div>

      {violationCount > 0 && !autoSubmitTriggered ? (
        <div className="fixed top-[4.75rem] inset-x-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-900">
          Proctoring incident recorded ({violationCount}/{maxViolations}). Stay on this tab with your
          face visible.
        </div>
      ) : null}

      {autoSubmitTriggered ? (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="rounded-xl bg-white p-6 max-w-md text-center shadow-xl">
            <p className="text-lg font-bold text-[#0c2340]">Exam ending — policy limit reached</p>
            <p className="text-sm text-slate-600 mt-2">
              {maxViolations} proctoring incidents were recorded. Your answers are being submitted
              automatically.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
