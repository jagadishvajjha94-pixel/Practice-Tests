'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { cn } from '@/lib/utils';

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
  test_id?: string | number;
  score?: number | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  time_taken?: number | null;
};

const navItems = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/admin/tests', label: 'Tests' },
  { href: '/admin/users', label: 'Users' },
] as const;

export function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
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

        const { data: adminUser, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !adminUser) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);

        const [{ data: users }, { data: attempts }, { data: tests }, { data: categoryRows }] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('test_attempts').select('*'),
          supabase.from('tests').select('id, name, category_id'),
          supabase.from('test_categories').select('id, name, slug'),
        ]);
        const attemptRows = (attempts ?? []) as DashboardAttemptRow[];
        setAllAttempts(attemptRows);

        const testsById = new Map<string, { name: string; category_id: string }>();
        for (const t of tests ?? []) {
          const row = t as { id: string | number; name?: string; category_id?: string };
          testsById.set(String(row.id), {
            name: row.name ?? `Test ${String(row.id)}`,
            category_id: row.category_id ?? '',
          });
        }
        setTestsMap(testsById);
        setCategories(
          (categoryRows ?? []).map((c) => {
            const x = c as { id: string; name: string; slug: string };
            return { id: x.id, name: x.name, slug: x.slug };
          })
        );

        const totalTests = attempts?.length || 0;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const testsLast7Days = (attempts ?? []).filter(
          (a) => new Date(String(a.created_at)).getTime() >= sevenDaysAgo.getTime()
        ).length;
        const categoryByTestId = new Map<string, string>();
        for (const [id, t] of testsById.entries()) {
          const c = (categoryRows ?? []).find((row) => (row as { id: string }).id === t.category_id) as
            | { slug?: string }
            | undefined;
          categoryByTestId.set(id, c?.slug ?? '');
        }
        let psychometricSubmitted = 0;
        let swarxSubmitted = 0;

        const byUser = new Map<string, DashboardStudent>();
        for (const u of users ?? []) {
          byUser.set(String((u as { id: string }).id), {
            id: String((u as { id: string }).id),
            email: String((u as { email?: string }).email ?? ''),
            full_name: (u as { full_name?: string | null }).full_name ?? null,
            created_at: String((u as { created_at?: string }).created_at ?? new Date().toISOString()),
            attempts: 0,
            avgScore: 0,
            latestAttemptAt: null,
            highestScore: 0,
            highestTestName: null,
          });
        }

        const scoresByUser = new Map<string, number[]>();
        for (const a of attemptRows) {
          const userId = String((a as { user_id?: string }).user_id ?? '');
          const score = Number((a as { score?: number | null }).score ?? 0);
          const createdAt = String((a as { created_at?: string }).created_at ?? '');
          const testId = String((a as { test_id?: string }).test_id ?? '');
          const slug = (categoryByTestId.get(testId) || '').toLowerCase();
          if (slug === 'psychometric') psychometricSubmitted += 1;
          if (slug === 'swarx') swarxSubmitted += 1;
          const row = byUser.get(userId);
          if (!row) continue;
          row.attempts += 1;
          if (score > row.highestScore) {
            row.highestScore = score;
            row.highestTestName = testsById.get(String((a as { test_id?: string }).test_id ?? ''))?.name ?? null;
          }
          if (!row.latestAttemptAt || new Date(createdAt) > new Date(row.latestAttemptAt)) {
            row.latestAttemptAt = createdAt;
          }
          if (!scoresByUser.has(userId)) scoresByUser.set(userId, []);
          scoresByUser.get(userId)!.push(score);
        }

        for (const [userId, values] of scoresByUser.entries()) {
          const row = byUser.get(userId);
          if (!row || values.length === 0) continue;
          row.avgScore = Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1));
        }

        const students = Array.from(byUser.values());
        const attendedStudents = students.filter((s) => s.attempts > 0).length;
        const lowPerformers = students.filter((s) => s.attempts > 0 && s.avgScore < 40).length;
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

        setStats({
          totalRegisteredUsers: users?.length ?? 0,
          totalStudentsAttended: attendedStudents,
          totalTestsSubmitted: totalTests,
          avgTestsPerStudent:
            attendedStudents > 0 ? Number((totalTests / attendedStudents).toFixed(1)) : 0,
          testsLast7Days,
          lowPerformers,
          psychometricSubmitted,
          swarxSubmitted,
        });
        setRecentStudents(recent);
        setTopStudents(top);
        setAllStudents(students);
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading admin dashboard...</p>
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Access denied</p>
      </div>
    );
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
    .map(([testId, row]) => ({
      testId,
      testName: testsMap.get(testId)?.name ?? `Test ${testId}`,
      attempts: row.attempts,
      avgScore: Number((row.totalScore / row.attempts).toFixed(1)),
      highestScore: row.highest,
      passRate: Number(((row.passed / row.attempts) * 100).toFixed(1)),
    }))
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
      const testName = testsMap.get(String(attempt.test_id ?? ''))?.name ?? `Test ${String(attempt.test_id ?? '-')}`;
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
    for (const attempt of allAttempts) {
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

  const isOverviewActive = pathname === '/admin' || pathname === '/admin/dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
              <p className="text-sm text-gray-500 mt-1">Overview, content, and learner analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportFullReportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Export full report (Excel CSV)
              </Button>
              <Link href="/dashboard">
                <Button variant="outline">Back to app</Button>
              </Link>
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {navItems.map((item) => {
              const active =
                item.href === '/admin/dashboard'
                  ? isOverviewActive
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={cn(
                      'inline-flex rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Card className="p-5 sm:col-span-2">
            <p className="text-gray-600 text-sm font-medium mb-2">Registered users</p>
            <p className="text-4xl font-bold text-slate-800">{stats.totalRegisteredUsers}</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Students with attempts</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalStudentsAttended}</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Tests submitted</p>
            <p className="text-3xl font-bold text-purple-600">{stats.totalTestsSubmitted}</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Avg tests / student</p>
            <p className="text-3xl font-bold text-green-600">{stats.avgTestsPerStudent}</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Tests (7 days)</p>
            <p className="text-3xl font-bold text-cyan-600">{stats.testsLast7Days}</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Need attention</p>
            <p className="text-3xl font-bold text-red-600">{stats.lowPerformers}</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Psychometric</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.psychometricSubmitted}</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">SWARX</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.swarxSubmitted}</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent student activity</h2>
            {recentStudents.length === 0 ? (
              <p className="text-sm text-gray-600">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name || student.email}</p>
                      <p className="text-xs text-gray-500">
                        {student.latestAttemptAt
                          ? `Last attempt: ${new Date(student.latestAttemptAt).toLocaleString()}`
                          : 'No attempts yet'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{student.attempts} tests</p>
                      <p className="text-xs text-gray-500">Avg {student.avgScore}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Highest score per student</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
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
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
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
              <p className="text-sm text-gray-600">No completed attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {filteredTopStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        #{index + 1} {student.full_name || student.email}
                      </p>
                      <p className="text-xs text-gray-500">
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
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Attendance rate</p>
            <p className="text-3xl font-bold text-blue-700">{attendanceRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalStudentsAttended}/{stats.totalRegisteredUsers} students attempted
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Overall average score</p>
            <p className="text-3xl font-bold text-violet-700">{overallAverageScore}%</p>
            <p className="text-xs text-gray-500 mt-1">Across {filteredAttempts.length} filtered attempts</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Pass rate (>= 40%)</p>
            <p className="text-3xl font-bold text-emerald-700">{passRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {passedCount}/{filteredAttempts.length} attempts passed
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-600 text-sm font-medium mb-2">Inactive students</p>
            <p className="text-3xl font-bold text-amber-700">{inactiveStudents}</p>
            <p className="text-xs text-gray-500 mt-1">No tests attempted yet</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Score distribution (by student average)</h2>
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
                      <p className="text-sm text-gray-700">
                        {band.count} student{band.count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-gray-800" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent test submissions</h2>
            {recentAttemptsFeed.length === 0 ? (
              <p className="text-sm text-gray-600">No attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAttemptsFeed.slice(0, 8).map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attempt.studentName}</p>
                      <p className="text-xs text-gray-500">
                        {attempt.testName} • {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{attempt.score}%</p>
                      <p className="text-xs text-gray-500 capitalize">{attempt.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Test-wise performance overview</h2>
            <p className="text-sm text-gray-500">Top tests by number of attempts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Test</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Attempts</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg score</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Highest score</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Pass rate</th>
                </tr>
              </thead>
              <tbody>
                {testWisePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No test attempts available for current filters.
                    </td>
                  </tr>
                ) : (
                  testWisePerformance.map((row) => (
                    <tr key={row.testId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{row.testName}</td>
                      <td className="py-3 px-4 text-gray-900">{row.attempts}</td>
                      <td className="py-3 px-4 text-gray-900">{row.avgScore}%</td>
                      <td className="py-3 px-4 text-gray-900">{row.highestScore}%</td>
                      <td className="py-3 px-4 text-gray-900">{row.passRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Student attendance and performance report</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredStudents.length} of {allStudents.length} students
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Attempts (written)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Average</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Highest</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Top Test</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No students matched your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{student.full_name || student.email}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{student.attempts}</td>
                      <td className="py-3 px-4 text-gray-900">{student.avgScore}%</td>
                      <td className="py-3 px-4 text-gray-900">{student.highestScore}%</td>
                      <td className="py-3 px-4 text-gray-700">{student.highestTestName || '-'}</td>
                      <td className="py-3 px-4 text-gray-700">
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
              <h2 className="text-xl font-bold text-gray-900 mb-3">Questions</h2>
              <p className="text-gray-600 mb-4">Manage question bank, add new questions, and import from CSV</p>
              <div className="text-blue-600 font-medium">Manage questions →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/tests">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Tests</h2>
              <p className="text-gray-600 mb-4">Create test sets, assign questions, and manage test settings</p>
              <div className="text-blue-600 font-medium">Manage tests →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/users">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Users</h2>
              <p className="text-gray-600 mb-4">View users and track learning analytics</p>
              <div className="text-blue-600 font-medium">Manage users →</div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
