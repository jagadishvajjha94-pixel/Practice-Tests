'use client';

import { use, useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Test, TestCategory } from '@/lib/types';
import {
  getClientUser,
  isClientAuthConfigured,
  isMissingPublicDbConfigError,
} from '@/lib/client-auth';
import { adaptTestRow } from '@/lib/practice-mappers';
import { formatDbError } from '@/lib/utils';
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
    void getClientUser().then((user) => {
      setListAccess(user ? 'full' : 'guest');
    });
  }, []);

  useEffect(() => {
    const refreshAccess = async () => {
      const user = await getClientUser();
      setListAccess(user ? 'full' : 'guest');
    };

    void refreshAccess();
    const interval = window.setInterval(() => void refreshAccess(), 30_000);
    const onFocus = () => void refreshAccess();
    window.addEventListener('focus', onFocus);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshAccess();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
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
        if (!isClientAuthConfigured()) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }

        const catRes = await fetch(`/api/tests?categoryId=${encodeURIComponent(categorySlug)}`, {
          cache: 'no-store',
        });
        if (!catRes.ok) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }
        const testsData = (await catRes.json()) as Record<string, unknown>[];
        const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
        setCategory(fallbackCategory);
        setTests(
          (testsData || []).map((row) => adaptTestRow(row as Record<string, unknown>)),
        );
      } catch (error) {
        if (isSchemaMissingError(error)) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }
        if (isMissingPublicDbConfigError(error)) {
          const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
          setCategory(fallbackCategory);
          setTests(getFallbackTestsByCategorySlug(categorySlug));
          return;
        }
        const msg = formatDbError(error);
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
