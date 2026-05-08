'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';

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

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supabaseEnvMissing, setSupabaseEnvMissing] = useState(false);
  const [stats, setStats] = useState({
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

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setSupabaseEnvMissing(true);
          setLoading(false);
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Check if user is admin
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

        // Fetch statistics
        const [{ data: users }, { data: attempts }, { data: tests }, { data: categoryRows }] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('test_attempts').select('*'),
          supabase.from('tests').select('id, name, category_id'),
          supabase.from('test_categories').select('id, name, slug'),
        ]);

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
        const testsLast7Days = (attempts ?? []).filter((a) =>
          new Date(String(a.created_at)).getTime() >= sevenDaysAgo.getTime()
        ).length;
        const categoryByTestId = new Map<string, string>();
        for (const [id, t] of testsById.entries()) {
          const c = (categoryRows ?? []).find(
            (row) => (row as { id: string }).id === t.category_id
          ) as { slug?: string } | undefined;
          categoryByTestId.set(id, c?.slug ?? '');
        }
        let psychometricSubmitted = 0;
        let swarxSubmitted = 0;

        const byUser = new Map<string, DashboardStudent>();
        for (const u of users ?? []) {
          byUser.set(String((u as { id: string }).id), {
            id: String((u as { id: string }).id),
            email: String((u as { email?: string }).email ?? ''),
            full_name: ((u as { full_name?: string | null }).full_name ?? null),
            created_at: String((u as { created_at?: string }).created_at ?? new Date().toISOString()),
            attempts: 0,
            avgScore: 0,
            latestAttemptAt: null,
            highestScore: 0,
            highestTestName: null,
          });
        }

        const scoresByUser = new Map<string, number[]>();
        for (const a of attempts ?? []) {
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
        <p className="text-gray-600">Loading admin panel...</p>
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
      const matchedTest = Array.from(testsMap.entries()).find(
        ([, t]) => t.name === student.highestTestName
      );
      if (!matchedTest) return false;
      if (matchedTest[1].category_id !== cat.id) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Students Attended</p>
            <p className="text-4xl font-bold text-blue-600">{stats.totalStudentsAttended}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Tests Submitted</p>
            <p className="text-4xl font-bold text-purple-600">{stats.totalTestsSubmitted}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Avg Tests / Student</p>
            <p className="text-4xl font-bold text-green-600">{stats.avgTestsPerStudent}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Tests (7 days)</p>
            <p className="text-4xl font-bold text-cyan-600">{stats.testsLast7Days}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Need Attention</p>
            <p className="text-4xl font-bold text-red-600">{stats.lowPerformers}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Psychometric Submitted</p>
            <p className="text-4xl font-bold text-indigo-600">{stats.psychometricSubmitted}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">SWARX Submitted</p>
            <p className="text-4xl font-bold text-emerald-600">{stats.swarxSubmitted}</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Student Activity</h2>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Highest Score Per Student</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Categories (Psychometric + SWARX)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Tests</option>
                {Array.from(testsMap.entries()).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student..."
              />
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

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/questions">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Questions</h2>
              <p className="text-gray-600 mb-4">Manage question bank, add new questions, and import from CSV</p>
              <div className="text-blue-600 font-medium">Manage Questions →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/tests">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Tests</h2>
              <p className="text-gray-600 mb-4">Create test sets, assign questions, and manage test settings</p>
              <div className="text-blue-600 font-medium">Manage Tests →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/users">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Users</h2>
              <p className="text-gray-600 mb-4">View users and track learning analytics</p>
              <div className="text-blue-600 font-medium">Manage Users →</div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
