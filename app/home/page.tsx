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
  const liveExams = data?.live ?? [];
  const focusLiveExam = liveExams.length > 0;

  return (
    <div className="app-page">
      <header className="app-page-header text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-11">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200/95">
            {COLLEGE.rce} · Student portal
          </span>
          <h1 className="mt-3 text-3xl sm:text-[2.35rem] font-bold tracking-tight text-white font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
            Welcome, {studentName}
          </h1>
          <p className="app-subtitle mt-3 text-white/88 max-w-2xl border-l-2 border-cyan-300/40 pl-4">
            When an examination is live, it appears below so you can begin immediately. Schedule and placement
            modules stay available from the main navigation.
          </p>
        </div>
      </header>

      <div
        className={`mx-auto px-4 py-10 sm:py-12 ${focusLiveExam ? 'max-w-3xl' : 'max-w-6xl'}`}
      >
        {loading ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className={focusLiveExam ? 'space-y-8' : 'grid lg:grid-cols-3 gap-8'}>
            <div className={focusLiveExam ? '' : 'lg:col-span-2 space-y-6'}>
              {data?.message ? (
                <Card className="p-5 border-amber-200/80 bg-amber-50/90 lux-surface">
                  <p className="text-sm text-amber-950">{data.message}</p>
                  <Link href="/profile" className="inline-block mt-3">
                    <Button variant="outline" size="sm">
                      Complete profile
                    </Button>
                  </Link>
                </Card>
              ) : null}

              <FeaturedExamCard exam={featured} emphasis={focusLiveExam ? 'hero' : 'default'} />

              {focusLiveExam && liveExams.length > 1 ? (
                <Card className="p-4 lux-surface rounded-xl border-slate-200/80">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                    Other live sessions
                  </p>
                  <ul className="space-y-2">
                    {liveExams.slice(1).map((e) => (
                      <li key={e.id}>
                        <Link
                          href={e.href}
                          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-[#0c2340] hover:bg-emerald-100/60 transition-colors"
                        >
                          <span className="truncate">
                            {e.icon} {e.title}
                          </span>
                          <span className="text-emerald-700 text-xs shrink-0">Start →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {!focusLiveExam ? (
                <p className="text-center text-sm text-slate-500 pt-2">
                  Use the site header or your dashboard for ElevateX, RMSET, and other practice modules.
                </p>
              ) : null}
            </div>

            {!focusLiveExam ? (
              <div className="lg:col-span-1">
                <ExamStatusPanel live={liveExams} upcoming={data?.upcoming ?? []} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedExamCard({
  exam,
  emphasis = 'default',
}: {
  exam: PortalExamItem | null;
  emphasis?: 'default' | 'hero';
}) {
  if (!exam) {
    return (
      <Card className="p-10 sm:p-12 text-center lux-surface rounded-2xl border-slate-200/80">
        <p className="text-xl font-semibold text-slate-800 font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
          No live examination right now
        </p>
        <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto leading-relaxed">
          When the examination cell opens a test window, it will appear here with a start button. Upcoming items
          are listed in the panel when nothing is live.
        </p>
      </Card>
    );
  }

  const isLive = exam.kind === 'live';
  const hero = emphasis === 'hero' && isLive;

  return (
    <Card
      className={`lux-surface rounded-2xl p-6 sm:p-10 border transition-shadow duration-300 ${
        hero
          ? 'border-emerald-400/90 ring-2 ring-emerald-500/25 shadow-xl shadow-emerald-900/10 bg-gradient-to-br from-emerald-50/90 via-white to-white'
          : isLive
            ? 'border-emerald-300/90 bg-gradient-to-br from-emerald-50/80 to-white'
            : 'border-amber-200/90 bg-gradient-to-br from-amber-50/50 to-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl" aria-hidden>{exam.icon}</span>
            <Badge tone={isLive ? 'success' : 'warning'}>{isLive ? 'LIVE' : 'UPCOMING'}</Badge>
          </div>
          <h2 className="text-2xl sm:text-[1.75rem] font-bold text-[#0c2340] leading-tight font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
            {exam.title}
          </h2>
          {exam.badge ? <p className="text-sm text-slate-500 mt-1">{exam.badge}</p> : null}
        </div>
        {!isLive ? <ExamCountdown targetIso={exam.starts_at} label="Test starts in" /> : null}
      </div>

      <p className="text-base text-slate-700 leading-relaxed mb-5">{exam.description}</p>

      {isElevateXModule(exam.module_key) && exam.kind === 'live' ? (
        <ElevateXLiveInfo compact className="mb-4" />
      ) : null}

      {exam.notice ? (
        <div className="rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-4 mb-6 shadow-inner shadow-slate-900/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Instructions</p>
          <p className="text-sm text-slate-800">{exam.notice}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-6">
        <span>Starts {new Date(exam.starts_at).toLocaleString()}</span>
        {exam.ends_at ? <span>· Ends {new Date(exam.ends_at).toLocaleString()}</span> : null}
        {exam.duration_minutes ? <span>· {exam.duration_minutes} minutes</span> : null}
      </div>

      {isLive ? (
        <Link href={exam.href}>
          <Button
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white shadow-lg shadow-emerald-900/20 font-semibold px-8"
          >
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
