'use client';

import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { use, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import {
  PRACTICE_PREVIEW_QUESTION_LIMIT,
  PSYCHOMETRIC_FULL_MINUTES,
  PSYCHOMETRIC_FULL_QUESTIONS,
  PSYCHOMETRIC_GUEST_MINUTES,
} from '@/lib/constants';
import { isSignupDisabled } from '@/lib/auth-features';

/** `pending` = waiting on Supabase session; avoid starting the test until resolved (prevents full-paper race). */
type PracticeAccessState = 'pending' | 'guest' | 'full';
export default function TakeTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const signupClosed = isSignupDisabled();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [practiceAccess, setPracticeAccess] = useState<PracticeAccessState>('pending');

  useLayoutEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setPracticeAccess('full');
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;

    const applySession = (session: Session | null) => {
      setPracticeAccess(session?.user ? 'full' : 'guest');
    };

    const refreshAccess = async () => {
      try {
        // Prefer local session first so right-after-login redirects show full paper immediately.
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          setPracticeAccess('full');
          return;
        }
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          setPracticeAccess('guest');
          return;
        }
        setPracticeAccess(user ? 'full' : 'guest');
      } catch {
        setPracticeAccess('guest');
      }
    };

    void refreshAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    const onWindowFocus = () => {
      void refreshAccess();
    };
    window.addEventListener('focus', onWindowFocus);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshAccess();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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
          /psychometric/i.test(adaptedTest.description ?? '') ||
          ((adaptedTest.total_questions ?? 0) <= 20 && (adaptedTest.duration ?? 0) <= 5);

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

  const shownQuestionCount =
    practiceAccess === 'full'
      ? PSYCHOMETRIC_FULL_QUESTIONS
      : practiceAccess === 'guest'
        ? PRACTICE_PREVIEW_QUESTION_LIMIT
        : null;
  const shownDurationMinutes =
    practiceAccess === 'full'
      ? PSYCHOMETRIC_FULL_MINUTES
      : practiceAccess === 'guest'
        ? PSYCHOMETRIC_GUEST_MINUTES
        : null;
  const runtimeTest =
    practiceAccess === 'full'
      ? { ...test, duration: PSYCHOMETRIC_FULL_MINUTES, total_questions: PSYCHOMETRIC_FULL_QUESTIONS }
      : practiceAccess === 'guest'
        ? { ...test, duration: PSYCHOMETRIC_GUEST_MINUTES, total_questions: PRACTICE_PREVIEW_QUESTION_LIMIT }
        : { ...test, duration: test.duration, total_questions: test.total_questions };

  if (!testStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/90 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-foreground mb-4">{test.name}</h1>
          
          <div className="space-y-4 mb-6 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questions:</span>
              <span className="font-semibold text-foreground">
                {shownQuestionCount == null ? '—' : shownQuestionCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-semibold text-foreground">
                {shownDurationMinutes == null ? '—' : `${shownDurationMinutes} minutes`}
              </span>
            </div>
          </div>

          {practiceAccess === 'pending' ? (
            <p className="mb-6 text-center text-sm text-muted-foreground">Checking sign-in status…</p>
          ) : null}

          {questions.length > PRACTICE_PREVIEW_QUESTION_LIMIT && practiceAccess === 'guest' ? (
            <div className="mb-6 rounded-lg border border-amber-400/50 bg-amber-500/20 p-4 text-sm text-amber-100">
              <p className="font-semibold text-amber-50">Free preview — first {PRACTICE_PREVIEW_QUESTION_LIMIT} questions</p>
              <p className="mt-2 text-foreground/95 leading-relaxed">
                Without an account you can only attempt <strong>{PRACTICE_PREVIEW_QUESTION_LIMIT}</strong> questions (
                this test has {questions.length} total).
                {signupClosed
                  ? ' Sign in with your student account to unlock every question and submit the full test.'
                  : ' Sign in or create an account to unlock every question and submit the full test.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-amber-500 text-amber-950 hover:bg-amber-400"
                  onClick={() =>
                    router.push(`/auth/login?redirect=${encodeURIComponent(pathname ?? `/tests/take/${testId}`)}`)
                  }
                >
                  Sign in to unlock full test
                </Button>
                {!signupClosed ? (
                  <Button type="button" variant="outline" className="border-border bg-background/60" asChild>
                    <Link href={`/auth/signup?redirect=${encodeURIComponent(pathname ?? `/tests/take/${testId}`)}`}>
                      Create account
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mb-6 rounded-lg border border-border bg-muted/45 p-4">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>Instructions:</strong>{' '}
              {test.question_time_limit_sec ? (
                <>
                  <span className="mb-2 block">
                    Each question runs on a short timer (about {test.question_time_limit_sec} seconds).
                    Use quick, instinctive answers — minimal reading. Time running out skips to the next item
                    (last item auto-finishes); you can still use Previous / Next.
                  </span>
                  {test.description ? (
                    <span className="mt-2 block text-muted-foreground">{test.description}</span>
                  ) : null}
                </>
              ) : (
                test.description ||
                'Answer all questions within the given time limit. You can review your answers before submission.'
              )}
            </p>
            {test.id.startsWith('fallback-psychometric') ? (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                This paper draws <strong>200 different</strong> visual/pattern items per session from a large
                bank (about 128k variants). Your set does not repeat inside the 30 minutes; other candidates
                normally get a different mix. For a fresh draw on the same device, open a new browser tab in
                incognito/private mode (or clear session storage for this site) before starting.
              </p>
            ) : null}
          </div>

          <Button
            onClick={() => setTestStarted(true)}
            disabled={practiceAccess === 'pending'}
            className="w-full mb-2"
          >
            {practiceAccess === 'pending' ? 'Checking account…' : 'Start Test'}
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
      <TestInterface test={runtimeTest} questions={questions} fullAccess={practiceAccess === 'full'} />
    </TestProvider>
  );
}
