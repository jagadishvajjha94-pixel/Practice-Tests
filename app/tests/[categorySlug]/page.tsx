'use client';

import type { Session } from '@supabase/supabase-js';
import { use, useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Test, TestCategory } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  isMissingPublicSupabaseConfigError,
  isSupabasePublicEnvConfigured,
} from '@/lib/supabase-public-env';
import { adaptTestRow } from '@/lib/practice-mappers';
import { formatSupabaseError } from '@/lib/utils';
import {
  getFallbackCategoryBySlug,
  getFallbackTestsByCategorySlug,
  isSchemaMissingError,
} from '@/lib/fallback-question-bank';
import {
  PRACTICE_PREVIEW_QUESTION_LIMIT,
  PSYCHOMETRIC_FULL_MINUTES,
  PSYCHOMETRIC_FULL_QUESTIONS,
  PSYCHOMETRIC_GUEST_MINUTES,
} from '@/lib/constants';

type ListAccessState = 'pending' | 'guest' | 'full';

export default function CategoryTestsPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = use(params);
  const [category, setCategory] = useState<TestCategory | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listAccess, setListAccess] = useState<ListAccessState>('pending');

  useLayoutEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setListAccess('full');
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;

    const applySession = (session: Session | null) => {
      setListAccess(session?.user ? 'full' : 'guest');
    };

    const refreshAccess = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          setListAccess('full');
          return;
        }
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          setListAccess('guest');
          return;
        }
        setListAccess(user ? 'full' : 'guest');
      } catch {
        setListAccess('guest');
      }
    };

    void refreshAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    const onFocus = () => {
      void refreshAccess();
    };
    window.addEventListener('focus', onFocus);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshAccess();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const fetchCategoryAndTests = async () => {
      if (categorySlug !== 'psychometric') {
        setCategory(null);
        setTests([]);
        setLoading(false);
        return;
      }
      setLoadError(null);
      try {
        if (!isSupabasePublicEnvConfigured()) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }
        const { data: categoryData, error: categoryError } = await supabase
          .from('test_categories')
          .select('*')
          .eq('slug', categorySlug)
          .single();

        if (categoryError) {
          if (isSchemaMissingError(categoryError)) {
            const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
            setCategory(fallbackCategory);
            setTests(getFallbackTestsByCategorySlug(categorySlug));
            return;
          }
          if (categoryError.code === 'PGRST116') {
            setCategory(null);
            setTests([]);
          } else {
            const msg = formatSupabaseError(categoryError);
            console.error(
              'Error fetching category:',
              msg,
              categoryError
            );
            setLoadError(msg);
            setCategory(null);
            setTests([]);
          }
          return;
        }

        setCategory(categoryData);

        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .eq('category_id', categoryData.id)
          .order('created_at', { ascending: false });

        if (testsError) {
          if (isSchemaMissingError(testsError)) {
            setTests(getFallbackTestsByCategorySlug(categorySlug));
            return;
          }
          const msg = formatSupabaseError(testsError);
          console.error('Error fetching tests for category:', msg, testsError);
          setLoadError(msg);
          setTests([]);
          return;
        }

        setTests(
          (testsData || []).map((row) =>
            adaptTestRow(row as unknown as Record<string, unknown>)
          )
        );
      } catch (error) {
        if (isSchemaMissingError(error)) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }
        if (isMissingPublicSupabaseConfigError(error)) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }
        const msg = formatSupabaseError(error);
        console.error('Error fetching category tests:', msg, error);
        setLoadError(msg);
        setCategory(null);
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndTests();
  }, [categorySlug]);

  const listedQuestions =
    listAccess === 'full'
      ? PSYCHOMETRIC_FULL_QUESTIONS
      : listAccess === 'guest'
        ? PRACTICE_PREVIEW_QUESTION_LIMIT
        : null;
  const listedMinutes =
    listAccess === 'full'
      ? PSYCHOMETRIC_FULL_MINUTES
      : listAccess === 'guest'
        ? PSYCHOMETRIC_GUEST_MINUTES
        : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading tests...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-foreground font-medium">
          {loadError
            ? 'Could not load this category'
            : categorySlug !== 'psychometric'
              ? 'Only psychometric test category is available'
              : 'Category not found'}
        </p>
        {loadError && (
          <p className="text-sm text-red-300 max-w-lg text-center">{loadError}</p>
        )}
        <Link href="/tests" className="text-violet-200 hover:text-white">
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {loadError ? (
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <p className="text-sm text-red-100 rounded-md border border-red-300/40 bg-red-500/15 px-4 py-3">
            {loadError}
          </p>
        </div>
      ) : null}
      {/* Header */}
      <div className="py-12 border-b border-white/15 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">{category.icon}</span>
            <div>
              <h1 className="text-4xl font-bold lux-heading">{category.name}</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">{category.description}</p>
        </div>
      </div>

      {/* Tests List */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {tests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No tests available in this category yet.</p>
            <Link href="/tests" className="text-violet-200 hover:text-white">
              Back to categories
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="p-6 hover:-translate-y-1 hover:border-white/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{test.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-white/15">
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="text-lg font-semibold text-foreground">
                      {listedQuestions == null ? '—' : listedQuestions}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold text-foreground">
                      {listedMinutes == null ? '—' : `${listedMinutes} min`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/tests/take/${test.id}`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Start Test
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
