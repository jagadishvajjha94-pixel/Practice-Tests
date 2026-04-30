'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Test, Question } from '@/lib/types';
import { useTest } from './test-context';
import QuestionDisplay from './question-display';
import QuestionNavigation from './question-navigation';
import TestTimer from './test-timer';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { answersMatchMcq } from '@/lib/practice-mappers';
import { formatSupabaseError } from '@/lib/utils';
import { isSchemaMissingError } from '@/lib/fallback-question-bank';

interface TestInterfaceProps {
  test: Test;
  questions: Question[];
}

export default function TestInterface({ test, questions }: TestInterfaceProps) {
  const router = useRouter();
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

  // Initialize timer
  useEffect(() => {
    setTimeRemaining(test.duration * 60);
  }, [test.duration, setTimeRemaining]);

  const currentQuestion = questions[currentQuestionIndex];
  const answered = answers[currentQuestion?.id]?.userAnswer !== null && answers[currentQuestion?.id]?.userAnswer !== undefined;
  const markedForReview = answers[currentQuestion?.id]?.isMarkedForReview || false;

  const answeredCount = Object.values(answers).filter(a => a.userAnswer !== null && a.userAnswer !== undefined).length;
  const markedCount = Object.values(answers).filter(a => a.isMarkedForReview).length;
  const unattendedCount = questions.length - answeredCount;

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

  const handleSubmitTest = async () => {
    if (!currentQuestion) return;

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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (test.id.startsWith('fallback-')) {
          saveLocalAttemptAndNavigate(scorePercent);
        } else {
          router.push('/auth/login');
        }
        return;
      }

      // Create test attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          user_id: user.id,
          test_id: test.id,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: 'completed',
          time_taken: test.duration * 60 - timeRemaining,
          answers: answers,
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Update attempt with score
      const { error: updateAttemptError } = await supabase
        .from('test_attempts')
        .update({ score: scorePercent })
        .eq('id', attempt.id);
      if (updateAttemptError) throw updateAttemptError;

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
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-600">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{test.name}</h1>
          <TestTimer duration={test.duration} />
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full grid md:grid-cols-4 gap-4 p-4">
        {/* Question Display */}
        <div className="md:col-span-3">
          <Card className="p-6 mb-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                  {currentQuestion.difficulty}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <QuestionDisplay question={currentQuestion} />
          </Card>

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="flex-1"
            >
              ← Previous
            </Button>
            <Button
              onClick={() =>
                setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))
              }
              disabled={currentQuestionIndex === questions.length - 1}
              variant="outline"
              className="flex-1"
            >
              Next →
            </Button>
            <Button
              onClick={() => setShowSubmitConfirm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              Submit Test
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card className="p-4 sticky top-20">
            <h3 className="font-semibold text-gray-900 mb-4">Test Status</h3>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">✓ Answered</span>
                <span className="font-semibold text-gray-900">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">⚑ Review</span>
                <span className="font-semibold text-gray-900">{markedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">○ Not Visited</span>
                <span className="font-semibold text-gray-900">{unattendedCount}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <QuestionNavigation
                questions={questions}
                currentIndex={currentQuestionIndex}
                answers={answers}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Test?</h2>
              <div className="space-y-2 mb-6 text-sm text-gray-600">
                <p>Questions Answered: <span className="font-semibold text-gray-900">{answeredCount}/{questions.length}</span></p>
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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
