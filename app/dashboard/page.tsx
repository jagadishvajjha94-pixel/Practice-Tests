'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, TestAttempt, Test } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { buildUserFromAuth, cn, formatSupabaseError } from '@/lib/utils';
import { getLastSubmitEntry, toDashboardAttemptFromFeed } from '@/lib/dashboard-feed';
import { formatScorePercent, averageScorePercent } from '@/lib/format-score';
import {
  fetchStudentDashboardAttempts,
  getClientDashboardAttempts,
  mergeAttempts,
} from '@/lib/test-attempts';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardAttempt = TestAttempt & { test: Test };

function mergeDashboardAttempts(
  a: DashboardAttempt[],
  b: DashboardAttempt[],
): DashboardAttempt[] {
  return mergeAttempts<DashboardAttempt>(a, b);
}

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

        setUser(buildUserFromAuth(authUser));

        const bootstrapAttempts = (): DashboardAttempt[] => {
          const client = getClientDashboardAttempts(authUser.id);
          const last = getLastSubmitEntry();
          if (last && last.user_id === authUser.id) {
            return [
              toDashboardAttemptFromFeed(last),
              ...client.filter((row) => String(row.id) !== String(last.id)),
            ];
          }
          return client;
        };

        setAttempts(bootstrapAttempts());

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
        setAttempts((prev) => {
          const next = mergedAttempts as DashboardAttempt[];
          if (next.length === 0) return prev.length > 0 ? prev : bootstrapAttempts();
          return mergeDashboardAttempts(prev, next);
        });

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
            setAttempts(getClientDashboardAttempts(fallbackUser.id));
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();

    const onFocus = () => void fetchDashboardData();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="app-page">
        <div className="app-page-header">
          <div className="max-w-6xl mx-auto px-4">
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-9 w-56 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
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

  const completedAttempts = attempts.filter((a) => a.status === 'completed');
  const averageScore =
    attempts.length > 0
      ? formatScorePercent(averageScorePercent(attempts.map((a) => Number(a.score) || 0)))
      : '0.00';
  const bestScore =
    attempts.length > 0
      ? formatScorePercent(Math.max(...attempts.map((a) => Number(a.score) || 0)))
      : '0.00';

  return (
    <div className="app-page">
      <header className="app-page-header">
        <div className="mx-auto max-w-6xl px-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 min-w-0">
            <span className="app-eyebrow">Student dashboard</span>
            <h1 className="app-title-xl">Welcome back, {user.full_name || user.email}</h1>
            <p className="app-subtitle">
              Track your progress, review past attempts, and prepare for upcoming assessments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {!isAdminUser ? (
              <Link href="/home">
                <Button variant="outline">← Home</Button>
              </Link>
            ) : null}
            {isAdminUser ? (
              <Link href="/admin">
                <Button variant="outline">Open admin panel</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Tests attempted" value={attempts.length} accent="navy" />
          <StatCard label="Completed" value={completedAttempts.length} accent="blue" />
          <StatCard label="Average score" value={`${averageScore}%`} accent="emerald" />
          <StatCard label="Best score" value={`${bestScore}%`} accent="indigo" />
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="app-section-title">Profile information</h2>
              <p className="app-muted mt-1">Used for placement tests and the AI interview studio.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Email</p>
              <p className="font-medium text-slate-900 truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Full name</p>
              <p className="font-medium text-slate-900">{user.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Phone</p>
              <p className="font-medium text-slate-900">{user.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Member since</p>
              <p className="font-medium text-slate-900">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="lux-divider mt-6 mb-5" />
          <div className="flex flex-wrap gap-2">
            <Link href="/profile">
              <Button variant="outline">Edit profile</Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline">Performance analytics</Button>
            </Link>
            <Link href="/ai/interview">
              <Button>AI Interview Studio</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="app-section-title">Recent test attempts</h2>
              <p className="app-muted mt-1">
                {attempts.length === 0
                  ? 'No attempts yet — start with any module to see results here.'
                  : `${attempts.length} attempt${attempts.length === 1 ? '' : 's'} on record`}
              </p>
            </div>
            {attempts.length > 0 ? (
              <Link href="/home">
                <Button variant="outline" size="sm">
                  View examinations
                </Button>
              </Link>
            ) : null}
          </div>

          {attempts.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
              <p className="text-slate-600 mb-4">You haven&apos;t taken any tests yet.</p>
              {!isAdminUser ? (
                <Link href="/home">
                  <Button>Go to examinations</Button>
                </Link>
              ) : (
                <Link href="/admin/tests">
                  <Button variant="outline">View student test monitoring</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th aria-label="actions" />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => {
                    const score = Number(attempt.score) || 0;
                    const passed = score >= 40;
                    const statusLabel = String(attempt.status ?? '').toLowerCase();
                    return (
                      <tr key={attempt.id}>
                        <td className="font-medium text-[#0c2340]">{attempt.test?.name}</td>
                        <td>
                          <span
                            className={cn(
                              'font-semibold tabular-nums',
                              passed ? 'text-emerald-700' : 'text-red-600',
                            )}
                          >
                            {formatScorePercent(attempt.score)}%
                          </span>
                        </td>
                        <td>
                          <Badge
                            tone={
                              statusLabel === 'completed'
                                ? 'success'
                                : statusLabel === 'in_progress'
                                  ? 'warning'
                                  : 'neutral'
                            }
                            className="capitalize"
                          >
                            {statusLabel.replace('_', ' ') || 'pending'}
                          </Badge>
                        </td>
                        <td className="text-slate-500 whitespace-nowrap">
                          {new Date(attempt.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <Link
                            href={`/tests/result/${encodeURIComponent(String(attempt.id))}`}
                            className="text-[#1e3a5f] hover:underline font-semibold"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
