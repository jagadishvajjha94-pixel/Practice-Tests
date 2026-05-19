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
      <div className="app-page">
        <div className="app-page-header">
          <div className="max-w-6xl mx-auto px-4">
            <div className="app-skeleton h-6 w-32 mb-3" />
            <div className="app-skeleton h-9 w-72 mb-2" />
            <div className="app-skeleton h-5 w-96" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="app-skeleton h-56" />
          ))}
        </div>
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
          <p className="text-sm text-red-600 max-w-lg text-center">{loadError}</p>
        )}
        <Link href="/tests" className="text-[#1e3a5f] hover:text-[#16304f]">
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div className="app-page">
      {loadError ? (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="app-alert-error">{loadError}</div>
        </div>
      ) : null}

      <header className="app-page-header">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          <Link
            href="/tests"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1e3a5f] hover:underline"
          >
            ← All categories
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-4xl drop-shadow-sm" aria-hidden>
              {category.icon}
            </span>
            <div>
              <h1 className="app-title-xl">{category.name}</h1>
              <p className="app-subtitle">{category.description}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {tests.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
            <p className="text-slate-600 mb-4">No tests available in this category yet.</p>
            <Link href="/tests" className="text-[#1e3a5f] hover:underline font-semibold">
              ← Back to categories
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tests.map((test) => (
              <Card key={test.id} interactive className="p-6">
                <div className="mb-4 min-h-[3.5rem]">
                  <h2 className="text-lg font-bold text-[#0c2340] tracking-tight">{test.name}</h2>
                  {test.description ? (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{test.description}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 py-3 border-y border-slate-100">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Questions
                    </p>
                    <p className="text-base font-bold text-[#0c2340] tabular-nums">
                      {listedQuestions == null ? '—' : listedQuestions}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Duration
                    </p>
                    <p className="text-base font-bold text-[#0c2340] tabular-nums">
                      {listedMinutes == null ? '—' : `${listedMinutes} min`}
                    </p>
                  </div>
                </div>

                <Link href={`/tests/take/${test.id}`} className="block">
                  <Button className="w-full">Start test →</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
