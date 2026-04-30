'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Test, TestCategory } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { adaptTestRow } from '@/lib/practice-mappers';
import { formatSupabaseError } from '@/lib/utils';
import {
  getFallbackCategoryBySlug,
  getFallbackTestsByCategorySlug,
  isSchemaMissingError,
} from '@/lib/fallback-question-bank';

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
        const supabase = getSupabaseBrowserClient();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading tests...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-900 font-medium">
          {loadError
            ? 'Could not load this category'
            : categorySlug !== 'psychometric'
              ? 'Only psychometric test category is available'
              : 'Category not found'}
        </p>
        {loadError && (
          <p className="text-sm text-red-600 max-w-lg text-center">{loadError}</p>
        )}
        <Link href="/tests" className="text-blue-600 hover:text-blue-700">
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {loadError ? (
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <p className="text-sm text-red-600 rounded-md border border-red-100 bg-red-50 px-4 py-3">
            {loadError}
          </p>
        </div>
      ) : null}
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">{category.icon}</span>
            <div>
              <h1 className="text-4xl font-bold">{category.name}</h1>
            </div>
          </div>
          <p className="text-blue-100 text-lg">{category.description}</p>
        </div>
      </div>

      {/* Tests List */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {tests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No tests available in this category yet.</p>
            <Link href="/tests" className="text-blue-600 hover:text-blue-700">
              Back to categories
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{test.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {test.difficulty_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Questions</p>
                    <p className="text-lg font-semibold text-gray-900">{test.total_questions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-lg font-semibold text-gray-900">{test.duration} min</p>
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
