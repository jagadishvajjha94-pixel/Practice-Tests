'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SPEAKING_TASKS } from '@/lib/placement/config';
import { scoreSpeakingTranscript } from '@/lib/placement/speaking-score';
import type { PlacementSpeakingResponse, SpeakingTask } from '@/lib/placement/types';

type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
};
type SpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Phase = 'idle' | 'recording' | 'done';

function TaskCard({
  task,
  taskIndex,
  totalTasks,
  existing,
  onComplete,
  onSkip,
}: {
  task: SpeakingTask;
  taskIndex: number;
  totalTasks: number;
  existing: PlacementSpeakingResponse | null;
  onComplete: (response: PlacementSpeakingResponse) => void;
  onSkip: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(existing ? 'done' : 'idle');
  const [transcript, setTranscript] = useState(existing?.transcript ?? '');
  const [interim, setInterim] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(task.recordSec);
  const [error, setError] = useState<string | null>(null);
  const [sttUnsupported, setSttUnsupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  /** Becomes true once stopAll has fired; prevents auto-restart from `onend`. */
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      try {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    try {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const finalize = useCallback(
    (rawTranscript: string) => {
      const durationSec = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );
      const sub = scoreSpeakingTranscript(task, rawTranscript, durationSec);
      const response: PlacementSpeakingResponse = {
        taskId: task.id,
        transcript: rawTranscript.trim(),
        durationSec,
        wordCount: sub.wordCount,
        fluency: sub.fluency,
        clarity: sub.clarity,
        grammar: sub.grammar,
        contentMatch: sub.contentMatch,
      };
      onComplete(response);
      setPhase('done');
    },
    [task, onComplete],
  );

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterim('');
    setSecondsLeft(task.recordSec);
    startedAtRef.current = Date.now();
    stoppedRef.current = false;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSttUnsupported(true);
      // Still allow recording-less mode: user types the transcript below.
      setPhase('recording');
      tickRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            window.clearInterval(tickRef.current!);
            tickRef.current = null;
            // Use whatever was typed.
            setPhase((current) => {
              if (current === 'recording') finalize(transcript);
              return current;
            });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return;
    }

    try {
      // Best-effort: also start mic recording so user can hear themselves later (not persisted).
      const stream = await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch(() => null);
      if (stream) {
        try {
          const rec = new MediaRecorder(stream);
          mediaRecorderRef.current = rec;
          rec.start();
        } catch {
          // Some browsers reject MediaRecorder without codec hint; ignore.
        }
      }
    } catch {
      // mic unavailable — STT may still work in some browsers
    }

    const recognition = new Ctor();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = '';
    recognition.onresult = (event) => {
      let nextInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalText += ' ' + text;
        } else {
          nextInterim += text;
        }
      }
      setTranscript(finalText.trim());
      setInterim(nextInterim);
    };
    recognition.onerror = (event) => {
      const reason = event?.error ?? 'unknown';
      if (reason === 'no-speech' || reason === 'aborted') return;
      setError(`Speech error: ${reason}`);
    };
    recognition.onend = () => {
      // Chrome auto-stops STT on silence; restart while the task is still active.
      if (stoppedRef.current) return;
      try {
        recognition.start();
      } catch {
        // ignore — already started or permission revoked
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setError(`Could not start microphone: ${(e as Error).message}`);
      return;
    }

    setPhase('recording');
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tickRef.current!);
          tickRef.current = null;
          stopAll();
          finalize(finalText.trim() || transcript);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [task.recordSec, transcript, phase, secondsLeft, stopAll, finalize]);

  const stopEarly = useCallback(() => {
    stopAll();
    finalize(transcript);
  }, [stopAll, transcript, finalize]);

  const reRecord = useCallback(() => {
    setPhase('idle');
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  const progress = useMemo(
    () => Math.round(((task.recordSec - secondsLeft) / task.recordSec) * 100),
    [task.recordSec, secondsLeft],
  );

  return (
    <Card className="p-6 border-slate-200 shadow-sm">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Task {taskIndex + 1} of {totalTasks} · {task.marks} marks
          </p>
          <h3 className="text-lg font-bold text-slate-900 mt-1">{task.title}</h3>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
          {task.recordSec}s
        </span>
      </div>

      <p className="text-sm text-slate-700 mb-4">{task.prompt}</p>

      {task.referenceText ? (
        <blockquote className="bg-slate-50 border-l-4 border-[#1e3a5f] p-3 mb-4 text-sm text-slate-800 italic">
          {task.referenceText}
        </blockquote>
      ) : null}

      {phase === 'recording' ? (
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Recording…</span>
            <span className="font-mono">{secondsLeft}s left</span>
          </div>
        </div>
      ) : null}

      {sttUnsupported ? (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          Your browser does not support live speech recognition. You can type what you said below and the AI will
          score that transcript. Chrome on desktop is recommended for full speaking analysis.
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Transcript {phase === 'recording' ? '(live)' : ''}
        </label>
        <textarea
          value={`${transcript}${interim ? ' ' + interim : ''}`}
          onChange={(e) => {
            if (phase !== 'recording') setTranscript(e.target.value);
          }}
          readOnly={phase === 'recording' && !sttUnsupported}
          rows={6}
          className="w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
          placeholder={sttUnsupported ? 'Type your spoken response here…' : 'Your speech will appear here as you talk.'}
        />
      </div>

      {error ? (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 mt-4">
        {phase === 'idle' ? (
          <>
            <Button onClick={() => void start()} className="bg-[#1e3a5f] hover:bg-[#16304f]">
              Start recording
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Skip this task
            </Button>
          </>
        ) : phase === 'recording' ? (
          <Button variant="outline" onClick={stopEarly}>
            Stop & evaluate
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={reRecord}>
              Re-record
            </Button>
            <Button variant="ghost" onClick={onSkip} className="text-slate-500">
              Continue without changes
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function SpeakingSection({
  responses,
  onSaveResponse,
  onAllDone,
}: {
  responses: PlacementSpeakingResponse[];
  onSaveResponse: (response: PlacementSpeakingResponse) => void;
  onAllDone: () => void;
}) {
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  useEffect(() => {
    const firstIncomplete = SPEAKING_TASKS.findIndex(
      (t) => !responses.some((r) => r.taskId === t.id),
    );
    if (firstIncomplete >= 0) setActiveTaskIndex(firstIncomplete);
  }, [responses]);

  const task = SPEAKING_TASKS[activeTaskIndex];
  const existing = responses.find((r) => r.taskId === task.id) ?? null;

  const goNext = useCallback(() => {
    const next = activeTaskIndex + 1;
    if (next >= SPEAKING_TASKS.length) {
      onAllDone();
      return;
    }
    setActiveTaskIndex(next);
  }, [activeTaskIndex, onAllDone]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SPEAKING_TASKS.map((t, i) => {
          const isDone = responses.some((r) => r.taskId === t.id);
          const isActive = i === activeTaskIndex;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTaskIndex(i)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                isActive
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : isDone
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400',
              ].join(' ')}
            >
              {i + 1}. {t.title} {isDone ? '✓' : ''}
            </button>
          );
        })}
      </div>

      <TaskCard
        key={task.id}
        task={task}
        taskIndex={activeTaskIndex}
        totalTasks={SPEAKING_TASKS.length}
        existing={existing}
        onComplete={(response) => {
          onSaveResponse(response);
          // Auto-advance after each task save.
          window.setTimeout(goNext, 400);
        }}
        onSkip={goNext}
      />
    </div>
  );
}
