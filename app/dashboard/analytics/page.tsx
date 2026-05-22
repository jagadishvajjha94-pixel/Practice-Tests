'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { formatScorePercentLabel } from '@/lib/format-score';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { downloadStudentReportPdf } from '@/lib/reports/student-pdf';
import { fetchStudentDashboardAttempts } from '@/lib/test-attempts';

type AttemptPoint = { name: string; score: number; date: string };

export default function StudentAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Student');
  const [email, setEmail] = useState('');
  const [attempts, setAttempts] = useState<AttemptPoint[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login?redirect=/dashboard/analytics');
        return;
      }

      const { data: profile } = await supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle();
      setName(profile?.full_name || 'Student');
      setEmail(profile?.email || user.email || '');

      const attemptRows = await fetchStudentDashboardAttempts(supabase, user.id);
      const points: AttemptPoint[] = attemptRows.map((row) => ({
        name: row.test?.name?.slice(0, 18) ?? 'Test',
        score: row.score ?? 0,
        date: new Date(row.completed_at ?? row.created_at ?? Date.now()).toLocaleDateString(),
      }));
      setAttempts(points.reverse());

      const low = points.filter((p) => p.score < 60).map((p) => p.name);
      setWeakTopics([...new Set(low)].slice(0, 5));
      setLoading(false);
    };
    void load();
  }, [router]);

  const avgScore = useMemo(() => {
    if (!attempts.length) return 0;
    return attempts.reduce((s, a) => s + a.score, 0) / attempts.length;
  }, [attempts]);

  const downloadPdf = () => {
    downloadStudentReportPdf({
      studentName: name,
      email,
      generatedAt: new Date().toLocaleString(),
      overallPercent: avgScore,
      totalAttempts: attempts.length,
      avgScore,
      weakTopics,
      recentTests: attempts.map((a) => ({ name: a.name, score: a.score, date: a.date })),
    });
  };

  if (loading) {
    return (
      <div className="app-page">
        <div className="app-page-header">
          <div className="max-w-5xl mx-auto px-4 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <span className="app-eyebrow">Insights</span>
            <h1 className="app-title-lg">Performance analytics</h1>
            <p className="app-subtitle">
              Score trends, weak topics, and a downloadable PDF report for {name}.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <Button onClick={downloadPdf}>Download PDF</Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Average score" value={formatScorePercentLabel(avgScore)} accent="emerald" />
          <StatCard label="Attempts" value={attempts.length} accent="navy" />
          <StatCard
            label="Weak areas"
            value={weakTopics.length || 0}
            hint={weakTopics.length ? weakTopics.slice(0, 3).join(', ') : 'None flagged'}
            accent={weakTopics.length ? 'amber' : 'cyan'}
          />
        </div>

        {attempts.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-slate-800 font-medium">No test attempts yet</p>
            <p className="text-sm text-slate-600 mt-2">
              Complete a practice test to see your score trend and analytics here.
            </p>
            <Button className="mt-5" asChild>
              <Link href="/tests">Browse practice tests</Link>
            </Button>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="app-section-title">Score trend</h2>
                  <p className="app-muted mt-0.5">Across recent {attempts.length} attempts</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attempts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#1e3a5f"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#1e3a5f' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="app-section-title">Recent tests</h2>
                  <p className="app-muted mt-0.5">Score breakdown per attempt</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attempts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="score" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
