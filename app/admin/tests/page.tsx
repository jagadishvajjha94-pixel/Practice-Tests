'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { formatSupabaseError } from '@/lib/utils';
import type { Test, TestAttempt, User } from '@/lib/types';

type AttemptWithMeta = TestAttempt & {
  testName: string;
  studentName: string;
  studentEmail: string;
};

export default function AdminTestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [supabaseEnvMissing, setSupabaseEnvMissing] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<AttemptWithMeta[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'abandoned'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setSupabaseEnvMissing(true);
          setLoading(false);
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          router.push('/auth/login');
          return;
        }

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', auth.user.id)
          .single();

        if (!adminUser) {
          router.push('/dashboard');
          return;
        }

        const [{ data: testsData, error: testsErr }, { data: usersData, error: usersErr }, { data: attemptsData, error: attemptsErr }] =
          await Promise.all([
            supabase.from('tests').select('*').order('created_at', { ascending: false }),
            supabase.from('users').select('*'),
            supabase.from('test_attempts').select('*').order('created_at', { ascending: false }),
          ]);

        if (testsErr) throw testsErr;
        if (usersErr) throw usersErr;
        if (attemptsErr) throw attemptsErr;

        const testsRows = (testsData ?? []) as Test[];
        const usersRows = (usersData ?? []) as User[];
        const attemptsRows = (attemptsData ?? []) as TestAttempt[];

        const testsById = new Map(testsRows.map((t) => [String(t.id), t]));
        const usersById = new Map(usersRows.map((u) => [String(u.id), u]));

        const enriched: AttemptWithMeta[] = attemptsRows.map((a) => {
          const t = testsById.get(String(a.test_id));
          const u = usersById.get(String(a.user_id));
          return {
            ...a,
            testName: t?.name ?? 'Unknown Test',
            studentName: u?.full_name || 'Unknown Student',
            studentEmail: u?.email || '-',
          };
        });

        setTests(testsRows);
        setAttempts(enriched);
      } catch (error) {
        console.error('Error loading admin tests:', formatSupabaseError(error), error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const filteredAttempts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return attempts.filter((a) => {
      const matchesTest = selectedTestId === 'all' || String(a.test_id) === selectedTestId;
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchesSearch =
        !q ||
        a.studentName.toLowerCase().includes(q) ||
        a.studentEmail.toLowerCase().includes(q) ||
        a.testName.toLowerCase().includes(q);
      return matchesTest && matchesStatus && matchesSearch;
    });
  }, [attempts, searchTerm, selectedTestId, statusFilter]);

  const summary = useMemo(() => {
    const total = filteredAttempts.length;
    const completed = filteredAttempts.filter((a) => a.status === 'completed');
    const avgScore =
      completed.length > 0
        ? Number(
            (
              completed.reduce((sum, a) => sum + Number(a.score ?? 0), 0) /
              completed.length
            ).toFixed(1)
          )
        : 0;
    const uniqueStudents = new Set(filteredAttempts.map((a) => String(a.user_id))).size;
    return { total, completed: completed.length, avgScore, uniqueStudents };
  }, [filteredAttempts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading tests dashboard...</p>
      </div>
    );
  }

  if (supabaseEnvMissing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600 text-center max-w-lg">{SUPABASE_PUBLIC_ENV_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Tests Monitoring</h1>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="p-5">
            <p className="text-sm text-gray-600">Attempts</p>
            <p className="text-3xl font-bold text-blue-600">{summary.total}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-3xl font-bold text-green-600">{summary.completed}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-gray-600">Students Attended</p>
            <p className="text-3xl font-bold text-[#1e3a5f]">{summary.uniqueStudents}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-gray-600">Average Marks</p>
            <p className="text-3xl font-bold text-orange-600">{summary.avgScore}%</p>
          </Card>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-3">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
            >
              <option value="all">All Tests (single admin view)</option>
              {tests.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'all' | 'completed' | 'in_progress' | 'abandoned'
                )
              }
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="abandoned">Abandoned</option>
            </select>

            <Input
              placeholder="Search student name/email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Test</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Marks</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Attempted On</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-500">
                      No student attempts found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((a) => (
                    <tr key={String(a.id)} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{a.testName}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{a.studentName}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{a.studentEmail}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-blue-700">
                        {a.score == null ? '-' : `${Math.round(Number(a.score))}%`}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

