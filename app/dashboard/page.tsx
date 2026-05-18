'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, TestAttempt, Test } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { buildUserFromAuth, formatSupabaseError } from '@/lib/utils';
import {
  fetchStudentDashboardAttempts,
  getBrowserDashboardAttempts,
} from '@/lib/test-attempts';

type DashboardAttempt = TestAttempt & { test: Test };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [attempts, setAttempts] = useState<DashboardAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseEnvMissing, setSupabaseEnvMissing] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          console.warn(SUPABASE_PUBLIC_ENV_MESSAGE);
          setSupabaseEnvMissing(true);
          setAttempts([]);
          setLoading(false);
          return;
        }
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (adminRow) {
          router.replace('/admin/dashboard');
          return;
        }

        if (String(authUser.user_metadata?.role ?? '') === 'faculty') {
          router.replace('/faculty/dashboard');
          return;
        }

        setIsAdminUser(false);

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
              'User creation error:',
              formatSupabaseError(createError),
              createError
            );
            setUser(buildUserFromAuth(authUser));
          } else {
            setUser(newUser);
          }
        } else if (userError) {
          console.warn(
            'User profile fetch failed; using auth metadata fallback:',
            formatSupabaseError(userError)
          );
          setUser(buildUserFromAuth(authUser));
        } else {
          setUser(userData);
        }

        const mergedAttempts = await fetchStudentDashboardAttempts(supabase, authUser.id);
        setAttempts(mergedAttempts as DashboardAttempt[]);
      } catch (error) {
        console.error(
          'Error fetching dashboard data:',
          formatSupabaseError(error),
          error
        );
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { data: { user: fallbackUser } } = await supabase.auth.getUser();
          if (fallbackUser?.id) {
            setAttempts(getBrowserDashboardAttempts(fallbackUser.id));
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();

    const onFocus = () => void fetchDashboardData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (supabaseEnvMissing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Card className="max-w-lg p-6">
          <h1 className="text-xl font-semibold text-foreground mb-2">Supabase is not configured</h1>
          <p className="text-muted-foreground text-sm mb-4">{SUPABASE_PUBLIC_ENV_MESSAGE}</p>
          {attempts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {attempts.length} practice result(s) saved in this browser only.
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load user data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="app-page-header">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Welcome back, {user.full_name || user.email}</p>
            </div>
            {isAdminUser ? (
              <Link href="/admin">
                <Button variant="outline">Open Admin Panel</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-muted-foreground text-sm font-medium mb-2">Tests Attempted</div>
            <div className="text-3xl font-bold text-primary">{attempts.length}</div>
          </Card>
          <Card className="p-6">
            <div className="text-muted-foreground text-sm font-medium mb-2">Completed Tests</div>
            <div className="text-3xl font-bold text-primary">
              {attempts.filter((a) => a.status === 'completed').length}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-muted-foreground text-sm font-medium mb-2">Average Score</div>
            <div className="text-3xl font-bold text-emerald-600">
              {attempts.length > 0
                ? Math.round(
                    attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
                  )
                : 0}
              %
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-muted-foreground text-sm font-medium mb-2">Best Score</div>
            <div className="text-3xl font-bold text-accent">
              {attempts.length > 0 ? Math.max(...attempts.map(a => a.score || 0)) : 0}%
            </div>
          </Card>
        </div>

        {/* Profile Section */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Profile Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-semibold text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Full Name</p>
              <p className="font-semibold text-foreground">{user.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <p className="font-semibold text-foreground">{user.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Joined</p>
              <p className="font-semibold text-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/profile">
              <Button variant="outline">Edit Profile</Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline">Performance Analytics</Button>
            </Link>
            <Link href="/ai/interview">
              <Button>AI Interview Studio</Button>
            </Link>
          </div>
        </Card>

        {/* Test History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Test Attempts</h2>

          {attempts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You haven&apos;t taken any tests yet.</p>
              {!isAdminUser ? (
                <Link href="/tests">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Start Your First Test
                  </Button>
                </Link>
              ) : (
                <Link href="/admin/tests">
                  <Button variant="outline">
                    View Student Test Monitoring
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Test Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-border/80 hover:bg-muted/40">
                      <td className="py-3 px-4 text-foreground">{attempt.test?.name}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${attempt.score! >= 40 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {Math.round(attempt.score || 0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-slate-100 text-foreground text-sm font-medium rounded capitalize">
                          {attempt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/tests/result/${attempt.id}`} className="text-[#1e3a5f] hover:text-[#16304f] font-medium">
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

        {!isAdminUser ? (
          <Card className="p-6 mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Ready for your next test?</h3>
                <p className="text-sm text-muted-foreground">Start a new attempt from the practice tests page.</p>
              </div>
              <Link href="/tests">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Take a Test
                </Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
