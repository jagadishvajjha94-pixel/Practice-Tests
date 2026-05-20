'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExamStatusPanel } from '@/components/student/exam-status-panel';
import { ExamCountdown } from '@/components/student/exam-countdown';
import { ElevateXLiveInfo } from '@/components/elevatex/elevatex-live-info';
import { isElevateXModule } from '@/lib/elevatex';
import type { PortalExamItem, StudentPortalPayload } from '@/lib/student-portal';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { COLLEGE } from '@/lib/college-brand';

type PortalResponse = StudentPortalPayload & { studentName?: string | null };

export default function StudentHomePage() {
  const router = useRouter();
  const [data, setData] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login/student');
        return;
      }
      const role = String(user.user_metadata?.role ?? '');
      if (role === 'faculty') {
        router.replace('/faculty/dashboard');
        return;
      }
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (adminRow || role === 'admin') {
        router.replace('/admin/dashboard');
        return;
      }
      const res = await fetch('/api/student/portal');
      if (res.ok) {
        setData((await res.json()) as PortalResponse);
      }
      setLoading(false);
    };
    void load();
    const id = window.setInterval(() => {
      void fetch('/api/student/portal')
        .then((r) => (r.ok ? r.json() : null))
        .then((json: PortalResponse | null) => {
          if (json) setData(json);
        });
    }, 30000);
    return () => clearInterval(id);
  }, [router]);

  const featured = data?.featured ?? null;
  const studentName = data?.studentName ?? 'Student';

  return (
    <div className="app-page">
      <header className="app-page-header border-b border-slate-200/80 bg-gradient-to-br from-[#0c2340] via-[#1e3a5f] to-[#2d4a6f] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/90">
            {COLLEGE.rce} · Student portal
          </span>
          <h1 className="app-title-xl mt-2 text-white">Welcome, {studentName}</h1>
          <p className="app-subtitle mt-2 text-white/85 max-w-2xl">
            Your scheduled examinations and assessment details from the Training & Placement cell.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {data?.message ? (
                <Card className="p-5 border-amber-200 bg-amber-50">
                  <p className="text-sm text-amber-900">{data.message}</p>
                  <Link href="/profile" className="inline-block mt-3">
                    <Button variant="outline" size="sm">Complete profile</Button>
                  </Link>
                </Card>
              ) : null}

              <FeaturedExamCard exam={featured} />

              <Card className="p-5 border-slate-200">
                <h2 className="text-lg font-bold text-[#0c2340] mb-2">Quick access</h2>
                <p className="text-sm text-slate-600 mb-4">
                  Open ElevateX for the talent challenge paper, RMSET for topic-selected tests, or AI Interview for spoken practice.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/placement">
                    <Button className="bg-fuchsia-700 hover:bg-fuchsia-800">ElevateX</Button>
                  </Link>
                  <Link href="/ai/interview">
                    <Button variant="outline">AI Interview Studio</Button>
                  </Link>
                  <Link href="/tests/rmset">
                    <Button variant="outline">RMSET</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="ghost">My dashboard →</Button>
                  </Link>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <ExamStatusPanel live={data?.live ?? []} upcoming={data?.upcoming ?? []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedExamCard({ exam }: { exam: PortalExamItem | null }) {
  if (!exam) {
    return (
      <Card className="p-8 text-center border-slate-200">
        <p className="text-lg font-semibold text-slate-800">No examination scheduled right now</p>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          When your college schedules a test, the title, instructions, and countdown will appear here.
        </p>
      </Card>
    );
  }

  const isLive = exam.kind === 'live';

  return (
    <Card
      className={`p-6 sm:p-8 border-2 ${
        isLive
          ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-white'
          : 'border-amber-300 bg-gradient-to-br from-amber-50/80 to-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl" aria-hidden>{exam.icon}</span>
            <Badge tone={isLive ? 'success' : 'warning'}>{isLive ? 'LIVE' : 'UPCOMING'}</Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0c2340] leading-tight">{exam.title}</h2>
          {exam.badge ? <p className="text-sm text-slate-500 mt-1">{exam.badge}</p> : null}
        </div>
        {!isLive ? <ExamCountdown targetIso={exam.starts_at} label="Test starts in" /> : null}
      </div>

      <p className="text-base text-slate-700 leading-relaxed mb-4">{exam.description}</p>

      {isElevateXModule(exam.module_key) && exam.kind === 'live' ? (
        <ElevateXLiveInfo compact className="mb-4" />
      ) : null}

      {exam.notice ? (
        <div className="rounded-lg border border-slate-200 bg-white/80 p-4 mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Instructions</p>
          <p className="text-sm text-slate-800">{exam.notice}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-5">
        <span>Starts {new Date(exam.starts_at).toLocaleString()}</span>
        {exam.ends_at ? <span>· Ends {new Date(exam.ends_at).toLocaleString()}</span> : null}
        {exam.duration_minutes ? <span>· {exam.duration_minutes} minutes</span> : null}
      </div>

      {isLive ? (
        <Link href={exam.href}>
          <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 w-full sm:w-auto">
            Start examination →
          </Button>
        </Link>
      ) : (
        <p className="text-sm text-amber-900 font-medium">
          The start button will be enabled when the countdown reaches zero and the test goes live.
        </p>
      )}
    </Card>
  );
}
