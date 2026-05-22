'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { averageScorePercent, formatScorePercentLabel } from '@/lib/format-score';

type AttemptWithMeta = {
  id: string | number;
  user_id: string;
  test_id: string | null;
  score: number | null;
  status: string;
  created_at: string;
  testName: string;
  studentName: string;
  studentEmail: string;
};

type TestOption = { id: string; name: string };

export default function AdminTestsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tests, setTests] = useState<TestOption[]>([]);
  const [attempts, setAttempts] = useState<AttemptWithMeta[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'abandoned'>(
    'all',
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/test-attempts');
        const json = (await res.json()) as {
          tests?: TestOption[];
          attempts?: AttemptWithMeta[];
          warnings?: string[];
          error?: string;
        };

        if (!res.ok) {
          setLoadError(json.error ?? 'Failed to load test attempts');
          return;
        }

        setTests(json.tests ?? []);
        setAttempts(json.attempts ?? []);
        setWarnings(json.warnings ?? []);
      } catch {
        setLoadError('Failed to load test attempts');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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
        ? averageScorePercent(completed.map((a) => Number(a.score ?? 0)))
        : 0;
    const uniqueStudents = new Set(filteredAttempts.map((a) => String(a.user_id))).size;
    return { total, completed: completed.length, avgScore, uniqueStudents };
  }, [filteredAttempts]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-gray-600">Loading tests dashboard…</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Test attempts"
        description="Monitor submissions, scores, and completion status across all tests."
      />

      {loadError ? (
        <Card className="p-4 mb-6 border-red-200 bg-red-50 text-red-800 text-sm">{loadError}</Card>
      ) : null}

      {warnings.length > 0 ? (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50 text-amber-900 text-sm space-y-1">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </Card>
      ) : null}

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
          <p className="text-sm text-gray-600">Students attended</p>
          <p className="text-3xl font-bold text-[#1e3a5f]">{summary.uniqueStudents}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-600">Average marks</p>
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
            <option value="all">All tests</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'completed' | 'in_progress' | 'abandoned')
            }
          >
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In progress</option>
            <option value="abandoned">Abandoned</option>
          </select>

          <Input
            placeholder="Search student name or email…"
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Attempted on</th>
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
                      {a.score == null ? '—' : formatScorePercentLabel(Number(a.score))}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                        {a.status.replace('_', ' ')}
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
  );
}
