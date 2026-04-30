'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, TestAttempt, Test } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { formatSupabaseError } from '@/lib/utils';

type DashboardAttempt = TestAttempt & { test: Test };

function getLocalAttempts(): DashboardAttempt[] {
  if (typeof window === 'undefined') return [];
  const out: DashboardAttempt[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith('localTestAttempt:')) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as {
        attempt?: TestAttempt;
        test?: Test;
      };
      if (!parsed.attempt || !parsed.test) continue;
      out.push({
        ...parsed.attempt,
        test: parsed.test,
      });
    } catch {
      // Ignore malformed local attempt payloads.
    }
  }

  return out.sort(
    (a, b) =>
      new Date(b.created_at ?? b.completed_at ?? 0).getTime() -
      new Date(a.created_at ?? a.completed_at ?? 0).getTime()
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [attempts, setAttempts] = useState<DashboardAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        // Fetch user profile
        let { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        // If user profile doesn't exist, create it
        if (userError && userError.code === 'PGRST116') {
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
              {
                id: authUser.id,
                email: authUser.email,
                full_name: authUser.user_metadata?.full_name || '',
                subscription_status: 'free',
              },
            ])
            .select()
            .single();

          if (createError) {
            console.error(
              '[v0] User creation error:',
              formatSupabaseError(createError),
              createError
            );
            setUser({
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || 'User',
              subscription_status: 'free',
              created_at: new Date(),
            } as User);
          } else {
            setUser(newUser);
          }
        } else if (userError) {
          console.warn(
            '[v0] User profile fetch failed; using auth metadata fallback:',
            formatSupabaseError(userError)
          );
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || 'User',
            subscription_status: 'free',
            created_at: new Date(),
          } as User);
        } else {
          setUser(userData);
        }

        // Fetch recent test attempts
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select(`
            *,
            test:tests(*)
          `)
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (attemptsError) {
          console.warn(
            '[v0] Attempts fetch warning:',
            formatSupabaseError(attemptsError)
          );
          setAttempts(getLocalAttempts());
        } else {
          const serverAttempts = ((attemptsData || []) as DashboardAttempt[]).map((a) => ({
            ...a,
            test: a.test
              ? {
                  ...a.test,
                  name: a.test.name || (a.test as unknown as { title?: string }).title || 'Practice test',
                }
              : ({
                  id: String(a.test_id ?? ''),
                  name: 'Practice test',
                  category_id: '',
                  duration: 0,
                  total_questions: 0,
                  passing_score: null,
                  description: null,
                  difficulty_level: null,
                  is_paid: false,
                  created_at: a.created_at,
                  updated_at: a.created_at,
                } as Test),
          }));
          const merged = [...getLocalAttempts(), ...serverAttempts].sort(
            (a, b) =>
              new Date(b.created_at ?? b.completed_at ?? 0).getTime() -
              new Date(a.created_at ?? a.completed_at ?? 0).getTime()
          );
          setAttempts(merged.slice(0, 10));
        }
      } catch (error) {
        console.error(
          'Error fetching dashboard data:',
          formatSupabaseError(error),
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Unable to load user data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.full_name || user.email}</p>
            </div>
            <Link href="/tests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Take a Test
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-gray-600 text-sm font-medium mb-2">Tests Attempted</div>
            <div className="text-3xl font-bold text-blue-600">{attempts.length}</div>
          </Card>
          <Card className="p-6">
            <div className="text-gray-600 text-sm font-medium mb-2">Completed Tests</div>
            <div className="text-3xl font-bold text-indigo-600">
              {attempts.filter((a) => a.status === 'completed').length}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-gray-600 text-sm font-medium mb-2">Average Score</div>
            <div className="text-3xl font-bold text-green-600">
              {attempts.length > 0
                ? Math.round(
                    attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
                  )
                : 0}
              %
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-gray-600 text-sm font-medium mb-2">Best Score</div>
            <div className="text-3xl font-bold text-purple-600">
              {attempts.length > 0 ? Math.max(...attempts.map(a => a.score || 0)) : 0}%
            </div>
          </Card>
        </div>

        {/* Profile Section */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="font-semibold text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Full Name</p>
              <p className="font-semibold text-gray-900">{user.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <p className="font-semibold text-gray-900">{user.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Joined</p>
              <p className="font-semibold text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link href="/profile">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>
        </Card>

        {/* Test History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Test Attempts</h2>

          {attempts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You haven&apos;t taken any tests yet.</p>
              <Link href="/tests">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Start Your First Test
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Test Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{attempt.test?.name}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${attempt.score! >= 40 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.round(attempt.score || 0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded capitalize">
                          {attempt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/tests/result/${attempt.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
