'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { LiveExamDashboard } from '@/components/admin/live-exam-dashboard';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { LoadingScreen } from '@/components/ui/loading-screen';

type DashboardStudent = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  attempts: number;
  avgScore: number;
  latestAttemptAt: string | null;
  highestScore: number;
  highestTestName: string | null;
};

type DashboardAttemptRow = {
  id: string | number;
  user_id?: string;
  test_id?: string | number | null;
  test_name?: string;
  score?: number | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  time_taken?: number | null;
};

export function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supabaseEnvMissing, setSupabaseEnvMissing] = useState(false);
  const [stats, setStats] = useState({
    totalRegisteredUsers: 0,
    totalStudentsAttended: 0,
    totalTestsSubmitted: 0,
    avgTestsPerStudent: 0,
    testsLast7Days: 0,
    lowPerformers: 0,
    psychometricSubmitted: 0,
    swarxSubmitted: 0,
  });
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [testsMap, setTestsMap] = useState<Map<string, { name: string; category_id: string }>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTest, setSelectedTest] = useState('all');
  const [search, setSearch] = useState('');
  const [recentStudents, setRecentStudents] = useState<DashboardStudent[]>([]);
  const [topStudents, setTopStudents] = useState<DashboardStudent[]>([]);
  const [allStudents, setAllStudents] = useState<DashboardStudent[]>([]);
  const [allAttempts, setAllAttempts] = useState<DashboardAttemptRow[]>([]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setSupabaseEnvMissing(true);
          setLoading(false);
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        setIsAdmin(true);

        const statsRes = await fetch('/api/admin/dashboard-stats', { credentials: 'include' });
        if (!statsRes.ok) {
          throw new Error('Failed to load dashboard stats');
        }
        const payload = (await statsRes.json()) as {
          stats: typeof stats;
          students: DashboardStudent[];
          attempts: DashboardAttemptRow[];
          tests: Array<{ id: string; name: string; category_id: string }>;
          categories: Array<{ id: string; name: string; slug: string }>;
        };

        setAllAttempts(payload.attempts ?? []);
        const testsById = new Map<string, { name: string; category_id: string }>();
        for (const t of payload.tests ?? []) {
          testsById.set(String(t.id), {
            name: t.name,
            category_id: t.category_id ?? '',
          });
        }
        setTestsMap(testsById);
        setCategories(payload.categories ?? []);

        const students = payload.students ?? [];
        const recent = [...students]
          .sort((a, b) => {
            const bt = b.latestAttemptAt ? new Date(b.latestAttemptAt).getTime() : 0;
            const at = a.latestAttemptAt ? new Date(a.latestAttemptAt).getTime() : 0;
            return bt - at;
          })
          .slice(0, 8);
        const top = [...students]
          .filter((s) => s.attempts > 0)
          .sort((a, b) => b.highestScore - a.highestScore)
          .slice(0, 5);

        setStats(payload.stats);
        setRecentStudents(recent);
        setTopStudents(top);
        setAllStudents(students);
      } catch (error) {
        console.error('Error loading admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    const reloadStats = async () => {
      try {
        const statsRes = await fetch('/api/admin/dashboard-stats', { credentials: 'include' });
        if (!statsRes.ok) return;
        const payload = (await statsRes.json()) as {
          stats: typeof stats;
          students: DashboardStudent[];
          attempts: DashboardAttemptRow[];
          tests: Array<{ id: string; name: string; category_id: string }>;
          categories: Array<{ id: string; name: string; slug: string }>;
        };
        setAllAttempts(payload.attempts ?? []);
        const testsById = new Map<string, { name: string; category_id: string }>();
        for (const t of payload.tests ?? []) {
          testsById.set(String(t.id), { name: t.name, category_id: t.category_id ?? '' });
        }
        setTestsMap(testsById);
        setCategories(payload.categories ?? []);
        setStats(payload.stats);
        setAllStudents(payload.students ?? []);
        const recent = [...(payload.students ?? [])]
          .sort((a, b) => {
            const bt = b.latestAttemptAt ? new Date(b.latestAttemptAt).getTime() : 0;
            const at = a.latestAttemptAt ? new Date(a.latestAttemptAt).getTime() : 0;
            return bt - at;
          })
          .slice(0, 8);
        const top = [...(payload.students ?? [])]
          .filter((s) => s.attempts > 0)
          .sort((a, b) => b.highestScore - a.highestScore)
          .slice(0, 5);
        setRecentStudents(recent);
        setTopStudents(top);
      } catch {
        // ignore background refresh errors
      }
    };

    void checkAdminAccess();
    const refreshTimer = setInterval(() => void reloadStats(), 5000);
    return () => clearInterval(refreshTimer);
  }, [router]);

  if (loading) {
    return <LoadingScreen message="Loading admin dashboard…" className="min-h-[60vh]" />;
  }

  if (supabaseEnvMissing) {
    return (
      <div className="lux-loading-screen min-h-[60vh] px-4">
        <p className="text-center max-w-lg text-slate-600">{SUPABASE_PUBLIC_ENV_MESSAGE}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <LoadingScreen message="Access denied" className="min-h-[60vh]" />;
  }

  const filteredTopStudents = topStudents.filter((student) => {
    const q = search.trim().toLowerCase();
    if (q && !(student.full_name || student.email).toLowerCase().includes(q)) return false;
    if (selectedTest !== 'all') {
      const wanted = testsMap.get(selectedTest)?.name;
      if (!wanted || student.highestTestName !== wanted) return false;
    }
    if (selectedCategory !== 'all') {
      const cat = categories.find((c) => c.slug === selectedCategory);
      if (!cat) return true;
      const matchedTest = Array.from(testsMap.entries()).find(([, t]) => t.name === student.highestTestName);
      if (!matchedTest) return false;
      if (matchedTest[1].category_id !== cat.id) return false;
    }
    return true;
  });

  const filteredStudents = allStudents.filter((student) => {
    const q = search.trim().toLowerCase();
    if (q && !(student.full_name || student.email).toLowerCase().includes(q)) return false;
    if (selectedTest !== 'all') {
      const wanted = testsMap.get(selectedTest)?.name;
      if (!wanted || student.highestTestName !== wanted) return false;
    }
    if (selectedCategory !== 'all') {
      const cat = categories.find((c) => c.slug === selectedCategory);
      if (!cat) return true;
      const matchedTest = Array.from(testsMap.entries()).find(([, t]) => t.name === student.highestTestName);
      if (!matchedTest) return false;
      if (matchedTest[1].category_id !== cat.id) return false;
    }
    return true;
  });

  const selectedCategoryId =
    selectedCategory === 'all' ? null : categories.find((c) => c.slug === selectedCategory)?.id ?? null;
  const filteredStudentIds = new Set(filteredStudents.map((s) => s.id));
  const filteredAttempts = allAttempts.filter((attempt) => {
    const userId = String(attempt.user_id ?? '');
    if (!filteredStudentIds.has(userId)) return false;
    const testId = String(attempt.test_id ?? '');
    if (selectedTest !== 'all' && selectedTest !== testId) return false;
    if (selectedCategoryId) {
      const test = testsMap.get(testId);
      if (!test || test.category_id !== selectedCategoryId) return false;
    }
    return true;
  });

  const studentsWithAttempts = filteredStudents.filter((s) => s.attempts > 0);
  const attendanceRate =
    stats.totalRegisteredUsers > 0
      ? Number(((stats.totalStudentsAttended / stats.totalRegisteredUsers) * 100).toFixed(1))
      : 0;
  const inactiveStudents = allStudents.filter((s) => s.attempts === 0).length;
  const overallAverageScore =
    filteredAttempts.length > 0
      ? Number(
          (
            filteredAttempts.reduce((sum, a) => sum + Number(a.score ?? 0), 0) / filteredAttempts.length
          ).toFixed(1)
        )
      : 0;
  const passedCount = filteredAttempts.filter((a) => Number(a.score ?? 0) >= 40).length;
  const passRate =
    filteredAttempts.length > 0 ? Number(((passedCount / filteredAttempts.length) * 100).toFixed(1)) : 0;

  const scoreBands = [
    {
      label: '90 - 100 (Excellent)',
      count: studentsWithAttempts.filter((s) => s.avgScore >= 90).length,
      tone: 'text-emerald-700',
    },
    {
      label: '75 - 89 (Strong)',
      count: studentsWithAttempts.filter((s) => s.avgScore >= 75 && s.avgScore < 90).length,
      tone: 'text-green-700',
    },
    {
      label: '40 - 74 (Average)',
      count: studentsWithAttempts.filter((s) => s.avgScore >= 40 && s.avgScore < 75).length,
      tone: 'text-amber-700',
    },
    {
      label: '0 - 39 (Needs support)',
      count: studentsWithAttempts.filter((s) => s.avgScore < 40).length,
      tone: 'text-red-700',
    },
  ];

  const testWisePerformance = Array.from(
    filteredAttempts.reduce((acc, attempt) => {
      const testId = String(attempt.test_id ?? '');
      if (!acc.has(testId)) {
        acc.set(testId, { attempts: 0, totalScore: 0, highest: 0, passed: 0 });
      }
      const row = acc.get(testId)!;
      const score = Number(attempt.score ?? 0);
      row.attempts += 1;
      row.totalScore += score;
      row.highest = Math.max(row.highest, score);
      if (score >= 40) row.passed += 1;
      return acc;
    }, new Map<string, { attempts: number; totalScore: number; highest: number; passed: number }>())
  )
    .map(([testId, row]) => {
      const sample = filteredAttempts.find((a) => String(a.test_id ?? '') === testId);
      return {
        testId,
        testName: sample?.test_name ?? testsMap.get(testId)?.name ?? `Test ${testId}`,
        attempts: row.attempts,
        avgScore: Number((row.totalScore / row.attempts).toFixed(1)),
        highestScore: row.highest,
        passRate: Number(((row.passed / row.attempts) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 8);

  const recentAttemptsFeed = [...filteredAttempts]
    .sort((a, b) => {
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      return bt - at;
    })
    .slice(0, 12)
    .map((attempt) => {
      const student = allStudents.find((s) => s.id === String(attempt.user_id ?? ''));
      const testName =
        attempt.test_name ??
        testsMap.get(String(attempt.test_id ?? ''))?.name ??
        `Test ${String(attempt.test_id ?? '-')}`;
      return {
        id: String(attempt.id ?? ''),
        studentName: student?.full_name || student?.email || 'Unknown student',
        studentEmail: student?.email || '-',
        testName,
        score: Number(attempt.score ?? 0),
        status: String(attempt.status ?? '-'),
        createdAt: attempt.created_at,
      };
    });

  const exportFullReportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];
    const generatedAt = new Date().toLocaleString();

    lines.push('Admin Dashboard Report');
    lines.push(`Generated At,${escape(generatedAt)}`);
    lines.push(`Registered Users,${stats.totalRegisteredUsers}`);
    lines.push(`Students With Attempts,${stats.totalStudentsAttended}`);
    lines.push(`Total Tests Submitted,${stats.totalTestsSubmitted}`);
    lines.push(`Average Tests Per Student,${stats.avgTestsPerStudent}`);
    lines.push(`Tests Submitted Last 7 Days,${stats.testsLast7Days}`);
    lines.push(`Need Attention (avg < 40),${stats.lowPerformers}`);
    lines.push('');

    lines.push('Student Performance');
    lines.push('Student Name,Email,Attempts,Average Score,Highest Score,Highest Test,Latest Attempt');
    for (const student of filteredStudents) {
      lines.push(
        [
          escape(student.full_name || '-'),
          escape(student.email),
          student.attempts,
          student.avgScore,
          student.highestScore,
          escape(student.highestTestName || '-'),
          escape(student.latestAttemptAt ? new Date(student.latestAttemptAt).toLocaleString() : '-'),
        ].join(',')
      );
    }
    lines.push('');

    lines.push('Attempt Level Details');
    lines.push('Attempt ID,Student Name,Student Email,Test Name,Category,Score,Status,Created At,Completed At,Time Taken (min)');
    const userById = new Map(filteredStudents.map((s) => [s.id, s]));
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    for (const attempt of filteredAttempts) {
      const userId = String(attempt.user_id ?? '');
      const student = userById.get(userId);
      if (!student) continue;
      const test = testsMap.get(String(attempt.test_id ?? ''));
      const categoryName = test?.category_id ? categoryById.get(test.category_id)?.name ?? '-' : '-';
      lines.push(
        [
          escape(String(attempt.id ?? '')),
          escape(student.full_name || '-'),
          escape(student.email),
          escape(test?.name || `Test ${String(attempt.test_id ?? '-')}`),
          escape(categoryName),
          Number(attempt.score ?? 0),
          escape(String(attempt.status ?? '-')),
          escape(attempt.created_at ? new Date(attempt.created_at).toLocaleString() : '-'),
          escape(attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : '-'),
          Math.round(Number(attempt.time_taken ?? 0) / 60),
        ].join(',')
      );
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <LiveExamDashboard />
      <AdminPageHeader
        title="Overview"
        description="College-wide performance, attendance, and exports"
        actions={
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" asChild>
              <Link href="/admin/reports">Per-test reports</Link>
            </Button>
            <Button onClick={exportFullReportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Export full report (CSV)
            </Button>
          </div>
        }
      />
      <div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <StatCard
            className="sm:col-span-2"
            label="Registered users"
            value={stats.totalRegisteredUsers}
            accent="navy"
          />
          <StatCard label="Students with attempts" value={stats.totalStudentsAttended} accent="blue" />
          <StatCard label="Tests submitted" value={stats.totalTestsSubmitted} accent="navy" />
          <StatCard label="Avg tests / student" value={stats.avgTestsPerStudent} accent="emerald" />
          <StatCard label="Tests (7 days)" value={stats.testsLast7Days} accent="cyan" />
          <StatCard label="Need attention" value={stats.lowPerformers} accent="red" />
          <StatCard label="Psychometric" value={stats.psychometricSubmitted} accent="indigo" />
          <StatCard label="SWARX" value={stats.swarxSubmitted} accent="emerald" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="app-section-title mb-4">Recent student activity</h2>
            {recentStudents.length === 0 ? (
              <p className="text-sm text-slate-600">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-medium text-[#0c2340]">{student.full_name || student.email}</p>
                      <p className="text-xs text-slate-500">
                        {student.latestAttemptAt
                          ? `Last attempt: ${new Date(student.latestAttemptAt).toLocaleString()}`
                          : 'No attempts yet'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0c2340]">{student.attempts} tests</p>
                      <p className="text-xs text-slate-500">Avg {student.avgScore}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#0c2340] mb-4">Highest score per student</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-[#0c2340] bg-white"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-[#0c2340] bg-white"
              >
                <option value="all">All tests</option>
                {Array.from(testsMap.entries()).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student..." />
            </div>
            {filteredTopStudents.length === 0 ? (
              <p className="text-sm text-slate-600">No completed attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {filteredTopStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-medium text-[#0c2340]">
                        #{index + 1} {student.full_name || student.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        Highest in: {student.highestTestName || '-'} | {student.attempts} attempts
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-600">{student.highestScore}%</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Attendance rate"
            value={`${attendanceRate}%`}
            hint={`${stats.totalStudentsAttended} of ${stats.totalRegisteredUsers} students have attempted at least one test`}
            accent="blue"
          />
          <StatCard
            label="Overall average score"
            value={`${overallAverageScore}%`}
            hint={`Across ${filteredAttempts.length} attempts in the current filter`}
            accent="navy"
          />
          <StatCard
            label="Pass rate (≥ 40%)"
            value={`${passRate}%`}
            hint={`${passedCount} of ${filteredAttempts.length} attempts met the pass threshold`}
            accent="emerald"
          />
          <StatCard
            label="Inactive students"
            value={inactiveStudents}
            hint="Registered but no test attempts yet"
            accent="amber"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#0c2340] mb-4">Score distribution (by student average)</h2>
            <div className="space-y-3">
              {scoreBands.map((band) => {
                const percent =
                  studentsWithAttempts.length > 0
                    ? Math.round((band.count / studentsWithAttempts.length) * 100)
                    : 0;
                return (
                  <div key={band.label}>
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${band.tone}`}>{band.label}</p>
                      <p className="text-sm text-slate-700">
                        {band.count} student{band.count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#3b6ea8]"
                        style={{ width: `${Math.max(percent, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#0c2340] mb-4">Recent test submissions</h2>
            {recentAttemptsFeed.length === 0 ? (
              <p className="text-sm text-slate-600">No attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAttemptsFeed.slice(0, 8).map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-sm font-medium text-[#0c2340]">{attempt.studentName}</p>
                      <p className="text-xs text-slate-500">
                        {attempt.testName} • {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0c2340]">{attempt.score}%</p>
                      <p className="text-xs text-slate-500 capitalize">{attempt.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#0c2340]">Test-wise performance overview</h2>
            <p className="text-sm text-slate-500">Top tests by number of attempts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Test</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Attempts</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Avg score</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Highest score</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Pass rate</th>
                </tr>
              </thead>
              <tbody>
                {testWisePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No test attempts available for current filters.
                    </td>
                  </tr>
                ) : (
                  testWisePerformance.map((row) => (
                    <tr key={row.testId} className="border-b border-slate-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-[#0c2340] font-medium">{row.testName}</td>
                      <td className="py-3 px-4 text-[#0c2340]">{row.attempts}</td>
                      <td className="py-3 px-4 text-[#0c2340]">{row.avgScore}%</td>
                      <td className="py-3 px-4 text-[#0c2340]">{row.highestScore}%</td>
                      <td className="py-3 px-4 text-[#0c2340]">{row.passRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xl font-bold text-[#0c2340]">Student attendance and performance report</h2>
            <p className="text-sm text-slate-500">
              Showing {filteredStudents.length} of {allStudents.length} students
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Attempts (written)</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Average</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Highest</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Top Test</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      No students matched your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#0c2340]">{student.full_name || student.email}</p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </td>
                      <td className="py-3 px-4 text-[#0c2340]">{student.attempts}</td>
                      <td className="py-3 px-4 text-[#0c2340]">{student.avgScore}%</td>
                      <td className="py-3 px-4 text-[#0c2340]">{student.highestScore}%</td>
                      <td className="py-3 px-4 text-slate-700">{student.highestTestName || '-'}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {student.latestAttemptAt ? new Date(student.latestAttemptAt).toLocaleString() : 'No attempts'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/questions">
              <h2 className="text-xl font-bold text-[#0c2340] mb-3">Questions</h2>
              <p className="text-slate-600 mb-4">Manage question bank, add new questions, and import from CSV</p>
              <div className="text-blue-600 font-medium">Manage questions →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/tests">
              <h2 className="text-xl font-bold text-[#0c2340] mb-3">Tests</h2>
              <p className="text-slate-600 mb-4">Create test sets, assign questions, and manage test settings</p>
              <div className="text-blue-600 font-medium">Manage tests →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/users">
              <h2 className="text-xl font-bold text-[#0c2340] mb-3">Users</h2>
              <p className="text-slate-600 mb-4">View users and track learning analytics</p>
              <div className="text-blue-600 font-medium">Manage users →</div>
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
