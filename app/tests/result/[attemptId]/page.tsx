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
import { formatScorePercent } from '@/lib/format-score';
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

  const storedScore = toNum(attemptRow.score);
  const storedPct = toNum(attemptRow.percentage_score);
  const totalScoreDb = toNum(attemptRow.total_score);

  const answeredCount = Object.values(answers).filter(
    (a: { userAnswer?: unknown }) =>
      a?.userAnswer !== null && a?.userAnswer !== undefined && a?.userAnswer !== ''
  ).length;

  const hasPerQuestion = answersHaveUserSelections(answers as Record<string, unknown>);

  let correctCount = 0;
  for (const question of questions) {
    const userAnswer = answers[question.id]?.userAnswer;
    if (answersMatchMcq(userAnswer, question.correct_answer)) {
      correctCount++;
    }
  }

  if (!hasPerQuestion && questions.length > 0) {
    if (totalScoreDb != null) {
      correctCount = Math.min(questions.length, Math.max(0, Math.round(totalScoreDb)));
    } else if (storedPct != null) {
      correctCount = Math.min(
        questions.length,
        Math.max(0, Math.round((storedPct / 100) * questions.length))
      );
    }
  }

  const displayAnsweredCount =
    hasPerQuestion
      ? answeredCount
      : questions.length > 0 &&
          (totalScoreDb != null || storedPct != null || storedScore != null)
        ? questions.length
        : answeredCount;

  const percentage =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * 100)
      : Math.round(storedPct ?? storedScore ?? attempt.score ?? 0);

  const displayPercentage = formatScorePercent(
    questions.length > 0 ? percentage : (storedPct ?? storedScore ?? attempt.score ?? 0),
  );

  const derivedFromAggregateOnly =
    summaryOnly ||
    (questions.length > 0 &&
      !hasPerQuestion &&
      (totalScoreDb != null || storedPct != null || storedScore != null));

  const isPassed = Number(displayPercentage) >= (test.passing_score || 40);

  return (
    <div className="exam-mode min-h-screen bg-white text-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Result Header */}
        <div className="text-center mb-8">
          <div className={`text-6xl font-bold mb-4 ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
            {displayPercentage}%
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPassed ? '🎉 Congratulations!' : 'Result'}
          </h1>
          <p className="text-lg text-gray-800 font-medium">{test.name}</p>
          <p className="text-gray-700 mt-2">
            {isPassed ? 'You passed the test!' : 'Keep practicing to improve your score'}
          </p>
          {derivedFromAggregateOnly ? (
            <p className="text-sm text-gray-500 mt-3 max-w-xl mx-auto">
              Your percentage and counts come from this attempt. Per-question responses are not stored in this
              database layout.
            </p>
          ) : null}
        </div>

        {/* Score Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 text-center bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <div className="text-2xl font-bold text-blue-600 mb-2">{correctCount}</div>
            <p className="text-gray-700 text-sm">Correct Answers</p>
          </Card>
          <Card className="p-6 text-center bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <div className="text-2xl font-bold text-orange-600 mb-2">{questions.length - correctCount}</div>
            <p className="text-gray-700 text-sm">Incorrect Answers</p>
          </Card>
          <Card className="p-6 text-center bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <div className="text-2xl font-bold text-[#1e3a5f] mb-2">
              {questions.length - displayAnsweredCount}
            </div>
            <p className="text-gray-700 text-sm">Unanswered</p>
          </Card>
          <Card className="p-6 text-center bg-white border-gray-200 text-gray-900 shadow-sm backdrop-blur-none">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {attempt.time_taken ? Math.floor(attempt.time_taken / 60) : 0}m
            </div>
            <p className="text-gray-700 text-sm">Time Taken</p>
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
