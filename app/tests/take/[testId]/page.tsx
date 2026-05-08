'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Test, Question } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { adaptQuestionRow, adaptTestRow } from '@/lib/practice-mappers';
import { TestProvider } from './test-context';
import TestInterface from './test-interface';
import {
  getFallbackQuestionsByTestId,
  getFallbackTestById,
  getPsychometricQuestionsForTestId,
  isSchemaMissingError,
  PSYCHOMETRIC_FALLBACK_QUESTION_COUNT,
} from '@/lib/fallback-question-bank';

export default function TakeTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          const fallbackTest = getFallbackTestById(testId);
          const fallbackQuestions = getFallbackQuestionsByTestId(testId);
          if (fallbackTest && fallbackQuestions.length > 0) {
            setTest(fallbackTest);
            setQuestions(fallbackQuestions);
          }
          setLoading(false);
          return;
        }
        // Fetch test details
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select('*')
          .eq('id', testId)
          .single();

        if (testError) throw testError;
        const adaptedTest = adaptTestRow(testData as Record<string, unknown>);

        // Fetch questions for this test
        const { data: testQuestions, error: questionsError } = await supabase
          .from('test_questions')
          .select('question:questions(*)')
          .eq('test_id', testId)
          .order('order', { ascending: true });

        if (questionsError) throw questionsError;

        let questionsData = (testQuestions ?? [])
          .map((tq) => (tq as { question?: Record<string, unknown> }).question)
          .filter((q): q is Record<string, unknown> => q != null)
          .map(adaptQuestionRow);

        if (questionsData.length === 0) {
          const { data: directQs, error: directErr } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', testId)
            .order('id', { ascending: true });
          if (!directErr && directQs?.length) {
            questionsData = directQs.map((q) => adaptQuestionRow(q as Record<string, unknown>));
          }
        }

        const psychometricLike =
          /psychometric/i.test(testId) ||
          /psychometric/i.test(adaptedTest.name ?? '') ||
          /psychometric/i.test(adaptedTest.description ?? '');

        if (
          psychometricLike &&
          questionsData.length < PSYCHOMETRIC_FALLBACK_QUESTION_COUNT
        ) {
          questionsData = getPsychometricQuestionsForTestId(testId);
          setTest({
            ...adaptedTest,
            total_questions: PSYCHOMETRIC_FALLBACK_QUESTION_COUNT,
            duration: Math.max(adaptedTest.duration ?? 0, 30),
            question_time_limit_sec: null,
            description:
              adaptedTest.description ??
              '200 visual/pattern psychometric items in 30 minutes.',
          });
        } else {
          setTest(adaptedTest);
        }

        setQuestions(questionsData);
      } catch (error) {
        if (isSchemaMissingError(error)) {
          const fallbackTest = getFallbackTestById(testId);
          const fallbackQuestions = getFallbackQuestionsByTestId(testId);
          if (fallbackTest && fallbackQuestions.length > 0) {
            setTest(fallbackTest);
            setQuestions(fallbackQuestions);
            return;
          }
        }
        console.error('Error fetching test:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-muted-foreground mb-4">Test not found</p>
          <Button
            onClick={() => router.back()}
            className="w-full"
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 border-white/25 bg-white/10 backdrop-blur-2xl">
          <h1 className="text-2xl font-bold lux-heading mb-4">{test.name}</h1>
          
          <div className="space-y-4 mb-6 p-4 bg-white/10 border border-white/20 rounded-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questions:</span>
              <span className="font-semibold text-foreground">{test.total_questions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-semibold text-foreground">{test.duration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Difficulty:</span>
              <span className="font-semibold text-foreground capitalize">{test.difficulty_level}</span>
            </div>
          </div>

          <div className="bg-black/20 border border-white/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-violet-100">
              <strong>Instructions:</strong>{' '}
              {test.question_time_limit_sec ? (
                <>
                  <span className="block mb-2">
                    Each question runs on a short timer (about {test.question_time_limit_sec} seconds).
                    Use quick, instinctive answers — minimal reading. Time running out skips to the next item
                    (last item auto-finishes); you can still use Previous / Next.
                  </span>
                  {test.description ? (
                    <span className="block opacity-95 text-violet-100/85">{test.description}</span>
                  ) : null}
                </>
              ) : (
                test.description ||
                'Answer all questions within the given time limit. You can review your answers before submission.'
              )}
            </p>
            {test.id.startsWith('fallback-psychometric') ? (
              <p className="text-xs text-violet-100/85 mt-3 leading-relaxed">
                This paper draws <strong>200 different</strong> visual/pattern items per session from a large
                bank (about 128k variants). Your set does not repeat inside the 30 minutes; other candidates
                normally get a different mix. For a fresh draw on the same device, open a new browser tab in
                incognito/private mode (or clear session storage for this site) before starting.
              </p>
            ) : null}
          </div>

          <Button
            onClick={() => setTestStarted(true)}
            className="w-full mb-2"
          >
            Start Test
          </Button>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <TestProvider>
      <TestInterface test={test} questions={questions} />
    </TestProvider>
  );
}
