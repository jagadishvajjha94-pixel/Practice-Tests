'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Test, Question } from '@/lib/types';
import { PRACTICE_PREVIEW_QUESTION_LIMIT } from '@/lib/constants';
import { useTest } from './test-context';
import QuestionDisplay from './question-display';
import QuestionNavigation from './question-navigation';
import TestTimer from './test-timer';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { answersMatchMcq } from '@/lib/practice-mappers';
import { formatSupabaseError } from '@/lib/utils';
import { isSchemaMissingError } from '@/lib/fallback-question-bank';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestAnswer } from './test-context';

/** When `test_attempts` has no JSON `answers`, some DBs keep rows in `question_answers` or `test_answers`. */
async function persistOptionalPerQuestionRows(
  supabase: SupabaseClient,
  attemptId: string | number,
  questions: Question[],
  answers: Record<string, TestAnswer>
) {
  if (!questions.length) return;

  const rows = questions.map((q) => {
    const raw = answers[q.id]?.userAnswer;
    const ua =
      raw === null || raw === undefined ? null : typeof raw === 'string' ? raw : String(raw);
    return {
      attempt_id: attemptId,
      question_id: q.id,
      user_answer: ua,
      is_correct: answersMatchMcq(raw, q.correct_answer),
      marked_for_review: Boolean(answers[q.id]?.isMarkedForReview),
    };
  });

  const { error: qaErr } = await supabase.from('question_answers').insert(rows);
  if (!qaErr) return;

  const rowsTa = questions.map((q) => {
    const raw = answers[q.id]?.userAnswer;
    const ua =
      raw === null || raw === undefined ? null : typeof raw === 'string' ? raw : String(raw);
    return {
      attempt_id: attemptId,
      question_id: q.id,
      user_answer: ua,
      is_correct: answersMatchMcq(raw, q.correct_answer),
    };
  });
  await supabase.from('test_answers').insert(rowsTa);
}

interface TestInterfaceProps {
  test: Test;
  questions: Question[];
  /** When false, only the first {@link PRACTICE_PREVIEW_QUESTION_LIMIT} questions are usable until the user signs in. */
  fullAccess: boolean;
}

export default function TestInterface({ test, questions, fullAccess }: TestInterfaceProps) {
  const router = useRouter();
  const pathname = usePathname();

  const loginHref = useMemo(
    () => `/auth/login?redirect=${encodeURIComponent(pathname || '/')}`,
    [pathname]
  );
  const {
    currentQuestionIndex,
    setCurrentQuestionIndex,
    answers,
    timeRemaining,
    setTimeRemaining,
    isSubmitted,
    setIsSubmitted,
  } = useTest();

  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const speedSecRaw = test.question_time_limit_sec;
  const speedActive =
    typeof speedSecRaw === 'number' && speedSecRaw > 0 ? true : false;
  const speedSec = speedActive ? Math.floor(Number(speedSecRaw)) : 0;
  const [questionTimeLeft, setQuestionTimeLeft] = useState(-1);

  const submitRef = useRef<() => Promise<void>>(async () => {});
  const prevTimeRemainingRef = useRef<number | null>(null);

  // Overall test countdown (minutes → seconds in context)
  useEffect(() => {
    setTimeRemaining(test.duration * 60);
  }, [test.duration, setTimeRemaining]);

  // Auto-submit when the overall test timer reaches zero (once per attempt).
  useEffect(() => {
    if (isSubmitted || submitting) return;
    const t = timeRemaining;
    const prev = prevTimeRemainingRef.current;
    prevTimeRemainingRef.current = t;
    if (prev === null) return;
    if (prev > 0 && t === 0) {
      void submitRef.current();
    }
  }, [timeRemaining, isSubmitted, submitting]);

  // Per-question speed clock (psychometric rapid items)
  useEffect(() => {
    if (!speedActive || !speedSec) return;

    let timeoutId = 0;
    let cancelled = false;
    const end = Date.now() + speedSec * 1000;

    const tick = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setQuestionTimeLeft(left);
      if (cancelled || left <= 0) return;
      timeoutId = window.setTimeout(tick, 1000);
    };
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [speedActive, speedSec, currentQuestionIndex]);

  const unlockedCount = useMemo(
    () =>
      fullAccess
        ? questions.length
        : Math.min(PRACTICE_PREVIEW_QUESTION_LIMIT, questions.length),
    [fullAccess, questions.length]
  );

  useEffect(() => {
    if (fullAccess) return;
    const maxAllowed = Math.max(0, unlockedCount - 1);
    setCurrentQuestionIndex(Math.min(currentQuestionIndex, maxAllowed));
  }, [fullAccess, unlockedCount, currentQuestionIndex, setCurrentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex];

  const scopeQuestions = fullAccess ? questions : questions.slice(0, unlockedCount);
  const answeredCount = scopeQuestions.filter(
    (q) => answers[q.id]?.userAnswer !== null && answers[q.id]?.userAnswer !== undefined
  ).length;
  const markedCount = scopeQuestions.filter((q) => answers[q.id]?.isMarkedForReview).length;
  const unattendedCount = scopeQuestions.length - answeredCount;

  const isPreviewMode = !fullAccess && questions.length > unlockedCount;

  const saveLocalAttemptAndNavigate = (scorePercent: number) => {
    const localAttemptId = `local-${Date.now()}`;
    const payload = {
      attempt: {
        id: localAttemptId,
        user_id: 'local-user',
        test_id: test.id,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        score: scorePercent,
        answers,
        time_taken: test.duration * 60 - timeRemaining,
        status: 'completed',
        created_at: new Date().toISOString(),
      },
      test,
      questions,
      answers,
    };
    localStorage.setItem(`localTestAttempt:${localAttemptId}`, JSON.stringify(payload));
    setIsSubmitted(true);
    router.push(`/tests/result/${localAttemptId}`);
  };

  const isMissingColumnError = (error: unknown, column: string) => {
    if (!error || typeof error !== 'object') return false;
    const e = error as { code?: string; message?: string };
    return e.code === 'PGRST204' && (e.message ?? '').toLowerCase().includes(`'${column.toLowerCase()}'`);
  };

  async function handleSubmitTest() {
    if (!currentQuestion || submitting || isSubmitted) return;

    setSubmitting(true);
    try {
      // Calculate score first so local fallback can reuse it.
      let score = 0;
      for (const question of questions) {
        const userAnswer = answers[question.id]?.userAnswer;
        if (answersMatchMcq(userAnswer, question.correct_answer)) {
          score++;
        }
      }
      const scorePercent = (score / questions.length) * 100;

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        saveLocalAttemptAndNavigate(scorePercent);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (test.id.startsWith('fallback-')) {
          saveLocalAttemptAndNavigate(scorePercent);
        } else {
          router.push(loginHref);
        }
        return;
      }

      const nowIso = new Date().toISOString();
      const elapsedSec = test.duration * 60 - timeRemaining;

      // Create test attempt (new schema first, fallback to legacy schema without answers/time_taken).
      let attempt: { id: string | number } | null = null;
      const { data: createdAttempt, error: createAttemptError } = await supabase
        .from('test_attempts')
        .insert({
          user_id: user.id,
          test_id: test.id,
          started_at: nowIso,
          completed_at: nowIso,
          status: 'completed',
          time_taken: elapsedSec,
          answers,
        })
        .select()
        .single();

      if (!createAttemptError) {
        attempt = createdAttempt as { id: string | number };
      } else if (
        isMissingColumnError(createAttemptError, 'answers') ||
        isMissingColumnError(createAttemptError, 'time_taken') ||
        isMissingColumnError(createAttemptError, 'score')
      ) {
        const { data: legacyAttempt, error: legacyCreateError } = await supabase
          .from('test_attempts')
          .insert({
            user_id: user.id,
            test_id: test.id,
            started_at: nowIso,
            completed_at: nowIso,
            status: 'completed',
          })
          .select()
          .single();
        if (legacyCreateError) throw legacyCreateError;
        attempt = legacyAttempt as { id: string | number };
      } else {
        throw createAttemptError;
      }

      // Update attempt with score (new schema first, then legacy columns).
      const { error: updateAttemptError } = await supabase
        .from('test_attempts')
        .update({ score: scorePercent, time_taken: elapsedSec, answers })
        .eq('id', attempt.id);

      if (updateAttemptError) {
        if (
          isMissingColumnError(updateAttemptError, 'score') ||
          isMissingColumnError(updateAttemptError, 'answers') ||
          isMissingColumnError(updateAttemptError, 'time_taken')
        ) {
          const { error: legacyUpdateError } = await supabase
            .from('test_attempts')
            .update({
              percentage_score: scorePercent,
              total_score: score,
              completed_at: nowIso,
              status: 'completed',
            })
            .eq('id', attempt.id);
          if (legacyUpdateError) throw legacyUpdateError;
        } else {
          throw updateAttemptError;
        }
      }

      await persistOptionalPerQuestionRows(supabase, attempt.id, questions, answers);

      setIsSubmitted(true);
      router.push(`/tests/result/${attempt.id}`);
    } catch (error) {
      // When schema/tables are missing in demo mode, continue with local submit.
      if (isSchemaMissingError(error) || test.id.startsWith('fallback-')) {
        let score = 0;
        for (const question of questions) {
          const userAnswer = answers[question.id]?.userAnswer;
          if (answersMatchMcq(userAnswer, question.correct_answer)) {
            score++;
          }
        }
        saveLocalAttemptAndNavigate((score / questions.length) * 100);
        return;
      }
      const message = formatSupabaseError(error);
      console.error('Error submitting test:', message, error);
      alert(`Failed to submit test. ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  submitRef.current = handleSubmitTest;

  useEffect(() => {
    if (!speedActive || questionTimeLeft !== 0) return;
    const run = window.setTimeout(() => {
      if (!fullAccess && currentQuestionIndex >= unlockedCount - 1) {
        router.push(loginHref);
        return;
      }
      if (fullAccess && currentQuestionIndex >= questions.length - 1) {
        void submitRef.current();
      } else {
        const cap = fullAccess ? questions.length - 1 : unlockedCount - 1;
        setCurrentQuestionIndex(Math.min(currentQuestionIndex + 1, cap));
      }
    }, 0);
    return () => clearTimeout(run);
  }, [
    questionTimeLeft,
    speedActive,
    currentQuestionIndex,
    questions.length,
    setCurrentQuestionIndex,
    fullAccess,
    unlockedCount,
    router,
    loginHref,
  ]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-600">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="exam-mode min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{test.name}</h1>
            {isPreviewMode ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-800">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Preview: {unlockedCount} of {questions.length} questions —{' '}
                <Link href={loginHref} className="font-medium underline underline-offset-2 hover:text-amber-950">
                  Sign in to unlock all
                </Link>
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-6">
            {speedActive && questionTimeLeft >= 0 ? (
              <div
                className={`text-base font-bold tabular-nums ${
                  questionTimeLeft <= 3 ? 'text-red-600' : 'text-amber-700'
                }`}
                title={`About ${speedSec}s per visual item`}
              >
                Question: {questionTimeLeft}s
              </div>
            ) : null}
            <TestTimer
              duration={test.duration}
              warnBelowSec={speedActive ? 90 : 300}
            />
          </div>
        </div>
      </header>

      <div aria-hidden className="h-[4.75rem] shrink-0 md:h-20" />

      <div className="flex-1 max-w-7xl mx-auto w-full grid md:grid-cols-4 gap-4 p-4 pb-8">
        {/* Question Display */}
        <div className="md:col-span-3">
          <Card className="p-6 mb-4 bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {currentQuestionIndex + 1} of{' '}
                  {isPreviewMode ? (
                    <>
                      {unlockedCount} <span className="text-gray-500">(preview of {questions.length})</span>
                    </>
                  ) : (
                    questions.length
                  )}
                </span>
                <span className="px-3 py-1 bg-violet-100 text-violet-900 text-xs font-semibold rounded">
                  {speedActive ? 'Speed / visual' : 'Question'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-violet-600 h-2.5 rounded-full transition-all"
                  style={{
                    width: `${((currentQuestionIndex + 1) / (isPreviewMode ? unlockedCount : questions.length)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <QuestionDisplay question={currentQuestion} speedMode={speedActive} />
          </Card>

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex-1"
            >
              ← Previous
            </Button>
            <Button
              onClick={() => {
                if (isPreviewMode && currentQuestionIndex >= unlockedCount - 1) {
                  router.push(loginHref);
                  return;
                }
                const cap = fullAccess ? questions.length - 1 : unlockedCount - 1;
                setCurrentQuestionIndex(Math.min(cap, currentQuestionIndex + 1));
              }}
              disabled={fullAccess ? currentQuestionIndex >= questions.length - 1 : false}
              className="flex-1"
            >
              {isPreviewMode && currentQuestionIndex >= unlockedCount - 1
                ? 'Sign in for more →'
                : 'Next →'}
            </Button>
            <Button
              onClick={() => {
                if (isPreviewMode) {
                  router.push(loginHref);
                  return;
                }
                setShowSubmitConfirm(true);
              }}
              variant="outline"
              className="px-6"
            >
              {isPreviewMode ? 'Unlock full test' : 'Submit Test'}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card className="p-4 md:sticky md:top-24 bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <h3 className="font-semibold text-gray-900 mb-4">Test Status</h3>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">✓ Answered</span>
                <span className="font-semibold text-gray-900">{answeredCount}</span>
              </div>
              {speedActive ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Unanswered</span>
                  <span className="font-semibold text-gray-900">{unattendedCount}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-yellow-700">⚑ Review</span>
                    <span className="font-semibold text-gray-900">{markedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">○ Not Visited</span>
                    <span className="font-semibold text-gray-900">{unattendedCount}</span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <QuestionNavigation
                questions={questions}
                currentIndex={currentQuestionIndex}
                answers={answers}
                unlockedCount={unlockedCount}
                loginHref={loginHref}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white border-gray-200 text-gray-900 shadow-xl backdrop-blur-none">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Test?</h2>
              <div className="space-y-2 mb-6 text-sm text-gray-600">
                <p>
                  Questions Answered:{' '}
                  <span className="font-semibold text-gray-900">
                    {answeredCount}/{questions.length}
                  </span>
                </p>
                <p>Once submitted, you cannot change your answers.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSubmitConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Continue Test
                </Button>
                <Button
                  onClick={handleSubmitTest}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Submitting...' : 'Submit Test'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
