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
  isSchemaMissingError,
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
        // Fetch test details
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select('*')
          .eq('id', testId)
          .single();

        if (testError) throw testError;
        setTest(adaptTestRow(testData as Record<string, unknown>));

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-gray-600 mb-4">Test not found</p>
          <Button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{test.name}</h1>
          
          <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between">
              <span className="text-gray-600">Questions:</span>
              <span className="font-semibold text-gray-900">{test.total_questions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-semibold text-gray-900">{test.duration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Difficulty:</span>
              <span className="font-semibold text-gray-900 capitalize">{test.difficulty_level}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Instructions:</strong> {test.description || 'Answer all questions within the given time limit. You can review your answers before submission.'}
            </p>
          </div>

          <Button
            onClick={() => setTestStarted(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-2"
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
