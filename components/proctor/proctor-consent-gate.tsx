'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PROCTOR_MAX_VIOLATIONS, PROCTOR_FACE_ABSENT_SEC } from '@/lib/exam-v2/proctoring-config';

type Props = {
  onReady: () => void;
  onCancel: () => void;
};

export function ProctorConsentGate({ onReady, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOk, setCameraOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enableCamera = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
      }
      setCameraOk(true);
    } catch {
      setError('Allow camera access to continue. Proctored exams require a live webcam.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    onReady();
  };

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-[#0c2340]">Proctored exam — camera required</p>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          This session is monitored for integrity. Tab switches, leaving the camera for more than{' '}
          {PROCTOR_FACE_ABSENT_SEC} seconds, multiple faces, or suspicious behavior are recorded.
          After {PROCTOR_MAX_VIOLATIONS} incidents the test auto-submits with your current answers.
        </p>
      </div>

      <div className="relative mx-auto max-w-xs aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-300">
        <video
          ref={videoRef}
          className="h-full w-full object-cover scale-x-[-1]"
          playsInline
          muted
          aria-label="Camera check preview"
        />
        {!cameraOk ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 p-3 text-center">
            Enable camera to verify your face is visible
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {!cameraOk ? (
          <Button type="button" onClick={() => void enableCamera()} disabled={loading}>
            {loading ? 'Enabling camera…' : 'Enable camera'}
          </Button>
        ) : (
          <Button type="button" onClick={handleStart}>
            Camera OK — continue to exam
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
