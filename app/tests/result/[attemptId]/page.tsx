'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TestAttempt, Test, Question } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { answersMatchMcq } from '@/lib/practice-mappers';
import { buildFeedEntry, pushDashboardFeedEntry } from '@/lib/dashboard-feed';
import { computeResultStats, formatTimeTaken } from '@/lib/result-stats';
import { loadAttemptResult } from '@/lib/load-attempt-result';
import { formatSupabaseError } from '@/lib/utils';

interface ResultData {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  answers: Record<string, any>;
}

function answersHaveUserSelections(answers: Record<string, unknown>): boolean {
  return Object.values(answers).some((entry) => {
    if (entry == null || typeof entry !== 'object') return false;
    const ua = (entry as { userAnswer?: unknown }).userAnswer;
    return ua !== null && ua !== undefined && ua !== '';
  });
}

function isAnswerAttemptedEntry(entry: unknown): boolean {
  if (entry == null || typeof entry !== 'object') return false;
  const ua = (entry as { userAnswer?: unknown }).userAnswer;
  return ua !== null && ua !== undefined && ua !== '';
}

function isMarkedForReviewFlag(entry: unknown): boolean {
  if (entry == null || typeof entry !== 'object') return false;
  const o = entry as Record<string, unknown>;
  return Boolean(o.isMarkedForReview ?? o.marked_for_review);
}

/** Omit from breakdown: never answered and only flagged for review. */
function includeQuestionInDetailedReview(
  questionId: string,
  answers: Record<string, unknown>
): boolean {
  const entry = answers[questionId];
  if (!isAnswerAttemptedEntry(entry) && isMarkedForReviewFlag(entry)) return false;
  return true;
}

type AttemptRow = TestAttempt & {
  percentage_score?: number | string | null;
  total_score?: number | string | null;
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function TestResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [summaryOnly, setSummaryOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setFetchError(SUPABASE_PUBLIC_ENV_MESSAGE);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user && !attemptId.startsWith('local-')) {
          setFetchError('Sign in to view your test results.');
          return;
        }

        const loaded = await loadAttemptResult(supabase, attemptId, user?.id);
        if (!loaded) {
          setFetchError(
            user ? 'Result not found. It may have been saved on another device.' : 'Sign in to view this result.',
          );
          return;
        }

        setResultData({
          attempt: loaded.attempt,
          test: loaded.test,
          questions: loaded.questions,
          answers: loaded.answers,
        });
        setSummaryOnly(loaded.summaryOnly);

        if (user?.id) {
          pushDashboardFeedEntry(
            user.id,
            buildFeedEntry({
              id: String(loaded.attempt.id),
              userId: user.id,
              testId: loaded.test.id,
              testName: loaded.test.name,
              scorePercent: loaded.attempt.score ?? 0,
              elapsedSec: loaded.attempt.time_taken ?? undefined,
              completedAtIso: loaded.attempt.completed_at ?? undefined,
              totalQuestions: loaded.test.total_questions || loaded.questions.length || undefined,
            }),
          );
        }
      } catch (error) {
        console.error('Error fetching result:', formatSupabaseError(error), error);
        setFetchError(formatSupabaseError(error));
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="exam-mode min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <p className="text-gray-700">Loading results...</p>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="exam-mode min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-4 text-center gap-4">
        <p className="text-gray-700">{fetchError ?? 'Results not found'}</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const { attempt, test, questions, answers } = resultData;
  const attemptRow = attempt as AttemptRow;

  const stats = computeResultStats({
    questions,
    answers: answers as Record<string, unknown>,
    storedScore: toNum(attemptRow.score),
    storedPct: toNum(attemptRow.percentage_score),
    totalScoreRaw: toNum(attemptRow.total_score),
    totalQuestionsHint: test.total_questions || questions.length,
    summaryOnly,
  });

  const {
    correctCount,
    incorrectCount,
    unansweredCount,
    displayPercentage,
  } = stats;

  const derivedFromAggregateOnly =
    summaryOnly ||
    (questions.length > 0 && !answersHaveUserSelections(answers as Record<string, unknown>));

  const isPassed = Number(displayPercentage) >= (test.passing_score || 40);
  const timeLabel = formatTimeTaken(attempt.time_taken);

  return (
    <div className="exam-mode min-h-screen bg-white text-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-8 sm:p-10 text-center shadow-sm">
          <div
            aria-hidden
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${
              isPassed
                ? 'from-emerald-400 via-emerald-500 to-emerald-600'
                : 'from-red-400 via-red-500 to-red-600'
            }`}
          />
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] mb-4 ${
              isPassed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPassed ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            {isPassed ? 'Passed' : 'Keep practicing'}
          </span>
          <div
            className={`text-6xl sm:text-7xl font-extrabold tabular-nums mb-3 ${
              isPassed ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {displayPercentage}%
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0c2340] mb-1 tracking-tight">
            {isPassed ? 'Excellent work!' : 'Your result'}
          </h1>
          <p className="text-base text-slate-700 font-medium">{test.name}</p>
          <p className="text-slate-600 mt-2 text-sm">
            {isPassed ? 'You passed the test!' : 'Review and try again to improve your score.'}
          </p>
          {derivedFromAggregateOnly ? (
            <p className="text-xs text-slate-500 mt-3 max-w-xl mx-auto">
              Your percentage and counts come from this attempt. Per-question responses are not
              stored in this database layout.
            </p>
          ) : null}
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 text-center bg-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Correct
            </p>
            <div className="text-3xl font-bold text-emerald-600 tabular-nums">{correctCount}</div>
          </Card>
          <Card className="p-5 text-center bg-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Incorrect
            </p>
            <div className="text-3xl font-bold text-red-600 tabular-nums">{incorrectCount}</div>
          </Card>
          <Card className="p-5 text-center bg-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Unanswered
            </p>
            <div className="text-3xl font-bold text-amber-600 tabular-nums">{unansweredCount}</div>
          </Card>
          <Card className="p-5 text-center bg-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Time taken
            </p>
            <div className="text-3xl font-bold text-[#1e3a5f] tabular-nums">{timeLabel}</div>
          </Card>
        </div>

        {/* Detailed Answers */}
        {derivedFromAggregateOnly ? (
          <Card className="p-6 mb-8 bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <p className="text-gray-700 text-center">
              {summaryOnly
                ? 'This is a summary of your attempt. Detailed question review is not stored for this test type (e.g. programming or summary-only save).'
                : 'Question-by-question review is not available for this attempt because only a summary score was saved on the server.'}
            </p>
            {attempt.completed_at ? (
              <p className="text-sm text-gray-500 text-center mt-3">
                Completed {new Date(attempt.completed_at).toLocaleString()}
              </p>
            ) : null}
          </Card>
        ) : (
          <Card className="p-6 mb-8 bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Detailed Answers</h2>

            {(() => {
              const answersRecord = answers as Record<string, unknown>;
              const questionsForDetail = questions.filter((q) =>
                includeQuestionInDetailedReview(q.id, answersRecord)
              );
              if (questionsForDetail.length === 0) {
                return (
                  <p className="text-gray-600 text-sm">
                    Nothing listed here: questions you did not answer and only marked for review are hidden.
                  </p>
                );
              }
              return (
                <div className="space-y-6">
                  {questionsForDetail.map((question, index) => {
                    const entry = answersRecord[question.id];
                    const userAnswer = answers[question.id]?.userAnswer;
                    const attempted = isAnswerAttemptedEntry(entry);
                    const isCorrect = answersMatchMcq(userAnswer, question.correct_answer);
                    const statusClass = attempted
                      ? isCorrect
                        ? 'bg-green-600'
                        : 'bg-red-600'
                      : 'bg-slate-500';

                    return (
                      <div key={question.id} className="pb-6 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-start gap-3 mb-3">
                          <span
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold text-white ${statusClass}`}
                          >
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{question.question_text}</h3>
                            <div className="mt-2 text-sm">
                              <div
                                className={`py-1 ${attempted ? (isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-600'}`}
                              >
                                <strong>Your answer:</strong>{' '}
                                {attempted ? userAnswer : 'Not answered'}
                              </div>
                              {attempted && !isCorrect && (
                                <div className="py-1 text-green-700">
                                  <strong>Correct answer:</strong> {question.correct_answer}
                                </div>
                              )}
                              {attempted && question.explanation ? (
                                <div className="py-2 text-gray-700">
                                  <strong>Explanation:</strong> {question.explanation}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button className="px-8">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/tests">
            <Button variant="outline" className="px-8">
              Take Another Test
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
