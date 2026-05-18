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
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { downloadStudentReportPdf } from '@/lib/reports/student-pdf';

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

      const { data: attemptRows } = await supabase
        .from('test_attempts')
        .select('score, percentage_score, created_at, completed_at, tests(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const points: AttemptPoint[] = (attemptRows ?? []).map((row) => {
        const r = row as {
          score?: number | null;
          percentage_score?: number | null;
          created_at?: string;
          completed_at?: string | null;
          tests?: { name?: string } | null;
        };
        const score = Number(r.score ?? r.percentage_score ?? 0);
        return {
          name: r.tests?.name?.slice(0, 18) ?? 'Test',
          score,
          date: new Date(r.completed_at ?? r.created_at ?? Date.now()).toLocaleDateString(),
        };
      });
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
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading analytics…</div>;
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance analytics</h1>
          <p className="text-sm text-muted-foreground">Scores, trends, and downloadable PDF report.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadPdf}>Download PDF report</Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 lux-surface">
          <p className="text-xs text-muted-foreground">Average score</p>
          <p className="text-3xl font-bold text-primary">{avgScore.toFixed(0)}%</p>
        </Card>
        <Card className="p-4 lux-surface">
          <p className="text-xs text-muted-foreground">Attempts</p>
          <p className="text-3xl font-bold text-foreground">{attempts.length}</p>
        </Card>
        <Card className="p-4 lux-surface">
          <p className="text-xs text-muted-foreground">Weak areas</p>
          <p className="text-sm text-foreground mt-2">{weakTopics.length ? weakTopics.join(', ') : 'None flagged'}</p>
        </Card>
      </div>

      {attempts.length === 0 ? (
        <Card className="p-8 lux-surface text-center">
          <p className="text-slate-800 font-medium">No test attempts yet</p>
          <p className="text-sm text-slate-600 mt-2">
            Complete a practice test to see your score trend and analytics here.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/tests">Browse practice tests</Link>
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-4 lux-surface h-72">
            <h2 className="text-sm font-medium mb-4">Score trend</h2>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={attempts}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 lux-surface h-72">
            <h2 className="text-sm font-medium mb-4">Recent tests</h2>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={attempts}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
