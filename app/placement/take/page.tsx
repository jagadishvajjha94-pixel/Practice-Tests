'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  PLACEMENT_EXAM_NAME,
  PLACEMENT_SECTIONS,
  PLACEMENT_TOTAL_MARKS,
  PLACEMENT_TOTAL_SEC,
  SPEAKING_TASKS,
  findDepartment,
} from '@/lib/placement/config';
import { computePlacementScorecard } from '@/lib/placement/scoring';
import { fetchElevateXAttemptStatus, getElevateXTestId } from '@/lib/placement/elevatex-attempt';
import { encodeElevateXScorecardAnswers } from '@/lib/placement/scorecard-payload';
import {
  clearPlacementDrafts,
  loadSession,
  markPlacementCompleted,
  saveScorecardForAttempt,
  saveSession,
} from '@/lib/placement/session';
import { recordDashboardAttempt } from '@/lib/record-dashboard-attempt';
import type {
  PlacementMcqAnswerMap,
  PlacementSectionId,
  PlacementSession,
  PlacementSpeakingResponse,
} from '@/lib/placement/types';
import SpeakingSection from '@/components/placement/speaking-section';
import type { Question } from '@/lib/types';

function formatHms(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function McqRunner({
  sectionId,
  questions,
  answers,
  onAnswerChange,
}: {
  sectionId: PlacementSectionId;
  questions: Question[];
  answers: PlacementMcqAnswerMap;
  onAnswerChange: (questionId: string, value: string | null) => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sectionId, questions.length]);

  const safeIndex = questions.length ? Math.min(index, questions.length - 1) : 0;
  const current = questions[safeIndex];
  if (!current) {
    return (
      <Card className="p-6 text-center text-slate-600">
        No questions available for this section.
      </Card>
    );
  }

  const options: Array<{ letter: 'A' | 'B' | 'C' | 'D'; text: string | null | undefined }> = [
    { letter: 'A', text: current.option_a },
    { letter: 'B', text: current.option_b },
    { letter: 'C', text: current.option_c },
    { letter: 'D', text: current.option_d },
  ];

  const selected = answers[current.id] ?? null;

  return (
    <div className="space-y-4">
      <Card className="p-5 border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Question {index + 1} of {questions.length}
          </p>
          {selected ? (
            <span className="text-xs font-semibold text-emerald-700">Answered</span>
          ) : (
            <span className="text-xs font-semibold text-slate-500">Unanswered</span>
          )}
        </div>
        <Progress value={((safeIndex + 1) / questions.length) * 100} className="h-1 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-4 whitespace-pre-wrap leading-snug">
          {current.question_text}
        </h2>
        <div className="space-y-2">
          {options
            .filter((o) => o.text != null && String(o.text).trim() !== '')
            .map(({ letter, text }) => {
              const active = selected === letter;
              return (
                <label
                  key={letter}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition',
                    active
                      ? 'border-[#1e3a5f] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${current.id}`}
                    value={letter}
                    checked={active}
                    onChange={() => onAnswerChange(current.id, letter)}
                    className="mt-1"
                  />
                  <span className="text-sm text-slate-900">
                    <strong className="text-[#1e3a5f] mr-2">{letter}.</strong>
                    {text}
                  </span>
                </label>
              );
            })}
        </div>
        <div className="flex gap-2 mt-5">
          <Button
            variant="outline"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="flex-1"
          >
            ← Previous
          </Button>
          {selected ? (
            <Button
              variant="ghost"
              className="text-slate-600"
              onClick={() => onAnswerChange(current.id, null)}
            >
              Clear answer
            </Button>
          ) : null}
          <Button
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={safeIndex >= questions.length - 1}
            className="flex-1"
          >
            Next →
          </Button>
        </div>
      </Card>

      <Card className="p-4 border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Question palette
        </p>
        <div className="grid grid-cols-10 gap-1.5">
          {questions.map((q, i) => {
            const isCurrent = i === safeIndex;
            const isAnswered = Boolean(answers[q.id]);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  'h-8 rounded text-xs font-bold border transition',
                  isCurrent
                    ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                    : isAnswered
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default function PlacementTakePage() {
  const router = useRouter();
  const [session, setSession] = useState<PlacementSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const submitGuardRef = useRef(false);
  const handleSubmitRef = useRef<(reason: 'manual' | 'timeout') => Promise<void>>(async () => {});

  // Hydrate session and block repeat attempts.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const status = await fetchElevateXAttemptStatus();
      if (cancelled) return;
      if (status.completed && status.attemptId) {
        setBlocked(true);
        router.replace(`/placement/result/${status.attemptId}`);
        return;
      }

      const loaded = loadSession();
      if (!loaded) {
        router.replace('/placement/assessment');
        return;
      }
      if (loaded.submitted) {
        router.replace('/placement/assessment');
        return;
      }
      setSession(loaded);
      setHydrated(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Autosave (every 5s) of the session.
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      saveSession(session);
    }, 5000);
    return () => window.clearInterval(id);
  }, [session]);

  // Tab switch detector (lightweight proctoring).
  useEffect(() => {
    if (!hydrated) return;
    const onVisibility = () => {
      if (document.hidden) setTabSwitches((c) => c + 1);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [hydrated]);

  // Disable copy / paste on the take page.
  useEffect(() => {
    if (!hydrated) return;
    const block = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('contextmenu', block);
    };
  }, [hydrated]);

  const currentSection = useMemo(() => {
    if (!session) return null;
    return PLACEMENT_SECTIONS[session.currentSectionIndex] ?? null;
  }, [session]);

  const handleSubmit = useCallback(
    async (reason: 'manual' | 'timeout') => {
      if (!session || submitGuardRef.current) return;
      submitGuardRef.current = true;
      setSubmitting(true);

      const finalSession: PlacementSession = { ...session, submitted: true };
      saveSession(finalSession);

      const scorecard = computePlacementScorecard(finalSession);
      const dept = findDepartment(scorecard.candidate.departmentId);
      const testName = `ElevateX · ${dept?.name ?? 'Department'}${reason === 'timeout' ? ' (auto-submit)' : ''}`;

      const elevateXTestId = getElevateXTestId();
      const res = await recordDashboardAttempt({
        testId: elevateXTestId,
        testName,
        scorePercent: scorecard.percentage,
        rawNetScore: scorecard.earnedMarks,
        elapsedSec: scorecard.totalElapsedSec,
        examKind: 'practice',
        answers: encodeElevateXScorecardAnswers(scorecard),
        test: {
          id: elevateXTestId,
          name: testName,
          category_id: 'placement',
          duration: 60,
          total_questions: PLACEMENT_TOTAL_MARKS,
        },
      });

      const attemptId = res?.attemptId ?? `placement-${Date.now()}`;
      saveScorecardForAttempt(attemptId, { ...scorecard, attemptId });
      markPlacementCompleted(scorecard.candidate.hallTicket, attemptId);
      clearPlacementDrafts(scorecard.candidate.hallTicket);
      if (res?.alreadyCompleted) {
        router.replace(`/placement/result/${attemptId}`);
        return;
      }
      router.replace(`/placement/result/${attemptId}`);
    },
    [session, router],
  );

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Overall exam timer only (no per-section countdown).
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.submitted) return prev;
        const nextGlobal = Math.max(0, prev.globalTimeLeftSec - 1);

        if (nextGlobal <= 0 && !submitGuardRef.current) {
          window.setTimeout(() => void handleSubmitRef.current('timeout'), 0);
        }

        return {
          ...prev,
          globalTimeLeftSec: nextGlobal,
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [hydrated]);

  const switchSection = (newIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      if (newIndex === prev.currentSectionIndex) return prev;
      if (!PLACEMENT_SECTIONS[newIndex]) return prev;
      return {
        ...prev,
        currentSectionIndex: newIndex,
      };
    });
  };

  const completeCurrentSection = () => {
    setSession((prev) => {
      if (!prev) return prev;
      const cfg = PLACEMENT_SECTIONS[prev.currentSectionIndex];
      const state = prev.sectionStates[cfg.id as PlacementSectionId];
      if (!state) return prev;
      const updatedStates = {
        ...prev.sectionStates,
        [cfg.id]: { ...state, completed: true },
      };

      // Find next incomplete section.
      let nextIndex = prev.currentSectionIndex + 1;
      while (
        nextIndex < PLACEMENT_SECTIONS.length &&
        updatedStates[PLACEMENT_SECTIONS[nextIndex].id as PlacementSectionId]?.completed
      ) {
        nextIndex += 1;
      }

      if (nextIndex >= PLACEMENT_SECTIONS.length) {
        return { ...prev, sectionStates: updatedStates };
      }

      return {
        ...prev,
        sectionStates: updatedStates,
        currentSectionIndex: nextIndex,
      };
    });
  };

  const setMcqAnswer = (questionId: string, value: string | null) => {
    setSession((prev) => {
      if (!prev) return prev;
      const cfg = PLACEMENT_SECTIONS[prev.currentSectionIndex];
      const state = prev.sectionStates[cfg.id as PlacementSectionId];
      if (!state || state.kind !== 'mcq') return prev;
      const nextAnswers = { ...state.answers };
      if (value === null) delete nextAnswers[questionId];
      else nextAnswers[questionId] = value;
      return {
        ...prev,
        sectionStates: {
          ...prev.sectionStates,
          [cfg.id]: { ...state, answers: nextAnswers },
        },
      };
    });
  };

  const saveSpeakingResponse = (response: PlacementSpeakingResponse) => {
    setSession((prev) => {
      if (!prev) return prev;
      const cfg = PLACEMENT_SECTIONS[prev.currentSectionIndex];
      const state = prev.sectionStates[cfg.id as PlacementSectionId];
      if (!state || state.kind !== 'speaking') return prev;
      const others = state.responses.filter((r) => r.taskId !== response.taskId);
      return {
        ...prev,
        sectionStates: {
          ...prev.sectionStates,
          [cfg.id]: {
            ...state,
            responses: [...others, response],
          },
        },
      };
    });
  };

  const overallProgress = useMemo(() => {
    if (!session) return 0;
    let answered = 0;
    let total = 0;
    for (const cfg of PLACEMENT_SECTIONS) {
      const state = session.sectionStates[cfg.id as PlacementSectionId];
      if (cfg.kind === 'mcq' && state?.kind === 'mcq') {
        total += state.questions.length;
        answered += Object.values(state.answers).filter(Boolean).length;
      } else if (cfg.kind === 'speaking' && state?.kind === 'speaking') {
        total += SPEAKING_TASKS.length;
        answered += state.responses.length;
      }
    }
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }, [session]);

  if (blocked || !hydrated || !session || !currentSection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">
          {blocked ? 'Redirecting to your ElevateX result…' : 'Preparing your placement session…'}
        </p>
      </div>
    );
  }

  const dept = findDepartment(session.candidate.departmentId);
  const sectionState = session.sectionStates[currentSection.id as PlacementSectionId];

  return (
    <div className="min-h-screen bg-slate-50 select-none">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-10 w-10 rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30 items-center justify-center text-xl shrink-0">
              ✨
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 truncate">
                {session.candidate.collegeName ?? 'Campus assessment'}
              </p>
              <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent truncate">
                {PLACEMENT_EXAM_NAME}
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex flex-col text-right text-xs ml-auto mr-3">
            <span className="opacity-70">{session.candidate.fullName}</span>
            <span className="opacity-70 font-mono">{session.candidate.hallTicket} · {dept?.name ?? 'Custom'}</span>
          </div>
          <div className="flex items-center gap-2 sm:ml-3">
            <div
              className={cn(
                'rounded-md px-3 py-1.5 text-center transition',
                session.globalTimeLeftSec <= 300
                  ? 'bg-red-500/90 animate-pulse'
                  : 'bg-white/10',
              )}
            >
              <p className="text-[10px] uppercase opacity-80 leading-none">Time left</p>
              <p className="font-mono text-lg font-bold tabular-nums leading-none mt-1">
                {formatHms(session.globalTimeLeftSec)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="ml-2 bg-emerald-500 hover:bg-emerald-400 text-white"
            disabled={submitting}
            onClick={() => {
              const ok = window.confirm(
                'Submit your placement assessment? You will not be able to change answers after this.',
              );
              if (ok) void handleSubmit('manual');
            }}
          >
            {submitting ? 'Submitting…' : 'Submit assessment'}
          </Button>
        </div>
        <div className="bg-white/10 h-1">
          <div
            className="bg-emerald-400 h-1 transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </header>

      {tabSwitches > 0 ? (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900">
          Tab switch detected ({tabSwitches}) — please remain on this tab for the full duration.
        </div>
      ) : null}

      <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Sections
          </p>
          {PLACEMENT_SECTIONS.map((s, i) => {
            const state = session.sectionStates[s.id as PlacementSectionId];
            const isCurrent = i === session.currentSectionIndex;
            const isDone = state?.completed;
            const counter =
              state?.kind === 'mcq'
                ? `${Object.values(state.answers).filter(Boolean).length}/${state.questions.length}`
                : state?.kind === 'speaking'
                  ? `${state.responses.length}/${SPEAKING_TASKS.length}`
                  : '';
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => switchSection(i)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border-2 transition flex items-start gap-3',
                  isCurrent
                    ? 'border-[#1e3a5f] bg-white shadow-sm'
                    : 'border-slate-200 bg-white/60 hover:border-slate-300',
                )}
              >
                <span className="text-xl shrink-0" aria-hidden>
                  {s.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {i + 1}. {s.short}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{s.marks} marks</p>
                  <p className="text-[11px] text-slate-700 mt-1 font-mono">{counter}</p>
                </div>
                {isDone ? (
                  <span className="text-emerald-600 text-xs font-bold">✓</span>
                ) : null}
              </button>
            );
          })}
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Move between sections freely. Only the overall {Math.round(PLACEMENT_TOTAL_SEC / 60)}-minute exam timer
            applies; submit before it reaches zero.
          </p>
        </aside>

        <section className="lg:col-span-3 space-y-4">
          <Card className="p-4 border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Section {session.currentSectionIndex + 1} of {PLACEMENT_SECTIONS.length}
                </p>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{currentSection.name}</h2>
                <p className="text-sm text-slate-600 mt-1">{currentSection.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-[#1e3a5f]">{currentSection.marks}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">marks</p>
              </div>
            </div>
          </Card>

          {sectionState?.kind === 'mcq' ? (
            <McqRunner
              key={currentSection.id}
              sectionId={currentSection.id}
              questions={sectionState.questions}
              answers={sectionState.answers}
              onAnswerChange={setMcqAnswer}
            />
          ) : sectionState?.kind === 'speaking' ? (
            <SpeakingSection
              responses={sectionState.responses}
              onSaveResponse={saveSpeakingResponse}
              onAllDone={completeCurrentSection}
            />
          ) : (
            <Card className="p-6 text-center text-slate-600">
              This section is not ready yet.
            </Card>
          )}

          <Card className="p-4 border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => switchSection(session.currentSectionIndex - 1)}
              disabled={session.currentSectionIndex === 0}
            >
              ← Previous section
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={completeCurrentSection}>
                {session.currentSectionIndex >= PLACEMENT_SECTIONS.length - 1
                  ? 'Mark as done'
                  : 'Save & next section →'}
              </Button>
              <Button
                className="bg-[#1e3a5f] hover:bg-[#16304f] text-white"
                onClick={() => switchSection(session.currentSectionIndex + 1)}
                disabled={session.currentSectionIndex >= PLACEMENT_SECTIONS.length - 1}
              >
                Skip to next →
              </Button>
            </div>
          </Card>

          <p className="text-[11px] text-slate-500 text-center">
            Need to leave?{' '}
            <Link href="/placement" className="underline">
              Your progress is auto-saved
            </Link>{' '}
            — you can return and resume on this device.
          </p>
        </section>
      </main>
    </div>
  );
}
