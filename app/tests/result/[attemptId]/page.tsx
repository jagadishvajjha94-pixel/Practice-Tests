'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TestAttempt, Test, Question } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { adaptQuestionRow, adaptTestRow, answersMatchMcq } from '@/lib/practice-mappers';
import { formatSupabaseError } from '@/lib/utils';

interface ResultData {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  answers: Record<string, any>;
}

export default function TestResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      if (attemptId.startsWith('local-')) {
        try {
          const raw = localStorage.getItem(`localTestAttempt:${attemptId}`);
          if (raw) {
            const parsed = JSON.parse(raw) as ResultData;
            setResultData(parsed);
          }
        } catch (error) {
          console.error('Error loading local result:', formatSupabaseError(error), error);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        // Fetch attempt
        const { data: attempt, error: attemptError } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('id', attemptId)
          .single();

        if (attemptError) throw attemptError;

        // Fetch test
        const { data: test, error: testError } = await supabase
          .from('tests')
          .select('*')
          .eq('id', attempt.test_id)
          .single();

        if (testError) throw testError;

        // Fetch questions
        const { data: testQuestions, error: questionsError } = await supabase
          .from('test_questions')
          .select('question:questions(*)')
          .eq('test_id', test.id)
          .order('order', { ascending: true });

        if (questionsError) throw questionsError;

        let questions = (testQuestions ?? [])
          .map((tq) => (tq as { question?: Record<string, unknown> }).question)
          .filter((q): q is Record<string, unknown> => q != null)
          .map(adaptQuestionRow);

        if (questions.length === 0) {
          const { data: directQs, error: dErr } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', attempt.test_id)
            .order('id', { ascending: true });
          if (!dErr && directQs?.length) {
            questions = directQs.map((q) =>
              adaptQuestionRow(q as Record<string, unknown>)
            );
          }
        }

        setResultData({
          attempt,
          test: adaptTestRow(test as Record<string, unknown>),
          questions,
          answers: attempt.answers || {},
        });
      } catch (error) {
        console.error('Error fetching result:', formatSupabaseError(error), error);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading results...</p>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Results not found</p>
      </div>
    );
  }

  const { attempt, test, questions, answers } = resultData;
  const score = attempt.score || 0;
  const percentage = Math.round(score);
  const answeredCount = Object.values(answers).filter(
    (a: any) => a.userAnswer !== null && a.userAnswer !== undefined
  ).length;

  // Calculate correct answers
  let correctCount = 0;
  for (const question of questions) {
    const userAnswer = answers[question.id]?.userAnswer;
    if (answersMatchMcq(userAnswer, question.correct_answer)) {
      correctCount++;
    }
  }

  const isPassed = percentage >= (test.passing_score || 40);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Result Header */}
        <div className="text-center mb-8">
          <div className={`text-6xl font-bold mb-4 ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
            {percentage}%
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPassed ? '🎉 Congratulations!' : 'Result'}
          </h1>
          <p className="text-gray-600">
            {isPassed ? 'You passed the test!' : 'Keep practicing to improve your score'}
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">{correctCount}</div>
            <p className="text-gray-600 text-sm">Correct Answers</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-2">{questions.length - correctCount}</div>
            <p className="text-gray-600 text-sm">Incorrect Answers</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">{questions.length - answeredCount}</div>
            <p className="text-gray-600 text-sm">Unanswered</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">{attempt.time_taken ? Math.floor(attempt.time_taken / 60) : 0}m</div>
            <p className="text-gray-600 text-sm">Time Taken</p>
          </Card>
        </div>

        {/* Detailed Answers */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Detailed Answers</h2>

          <div className="space-y-6">
            {questions.map((question, index) => {
              const userAnswer = answers[question.id]?.userAnswer;
              const isCorrect = answersMatchMcq(userAnswer, question.correct_answer);

              return (
                <div key={question.id} className="pb-6 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold text-white ${isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{question.question_text}</h3>
                      <div className="mt-2 text-sm">
                        <div className={`py-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          <strong>Your answer:</strong> {userAnswer || 'Not answered'}
                        </div>
                        {!isCorrect && (
                          <div className="py-1 text-green-700">
                            <strong>Correct answer:</strong> {question.correct_answer}
                          </div>
                        )}
                        {question.explanation && (
                          <div className="py-2 text-gray-700">
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">
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
