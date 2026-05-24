'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ElevateXLiveInfo } from '@/components/elevatex/elevatex-live-info';
import { isElevateXModule } from '@/lib/elevatex';
import type { PortalExamItem, StudentPortalPayload } from '@/lib/student-portal';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { COLLEGE } from '@/lib/college-brand';

type PortalResponse = StudentPortalPayload & { studentName?: string | null };

export function StudentExamsPortal() {
  const router = useRouter();
  const [data, setData] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPortal = async () => {
    const res = await fetch('/api/student/portal', { credentials: 'include', cache: 'no-store' });
    if (res.ok) {
      setData((await res.json()) as PortalResponse);
    }
    setLoading(false);
  };

  useEffect(() => {
    const boot = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      await fetch('/api/student/sync-profile', { method: 'POST', credentials: 'include' }).catch(
        () => null,
      );
      await loadPortal();
    };
    void boot();
    const id = window.setInterval(() => void loadPortal(), 15000);
    return () => clearInterval(id);
  }, [router]);

  const liveExams = data?.live ?? [];
  const featured = liveExams[0] ?? null;

  return (
    <div className="app-page">
      <header className="app-page-header text-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-11">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200/95">
            {COLLEGE.rce} · Live examinations
          </span>
          <h1 className="mt-3 text-3xl sm:text-[2.35rem] font-bold tracking-tight text-white font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
            Examinations
          </h1>
          <p className="app-subtitle mt-3 text-white/88 max-w-2xl border-l-2 border-cyan-300/40 pl-4">
            Only live exams assigned to your department and year appear here. When a session is open,
            use Start examination to begin.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        {loading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : (
          <div className="space-y-6">
            {data?.message ? (
              <Card className="p-5 border-amber-200/80 bg-amber-50/90 lux-surface">
                <p className="text-sm text-amber-950">{data.message}</p>
                <p className="text-xs text-amber-900/80 mt-2">
                  Contact your department faculty if your department or year is incorrect.
                </p>
              </Card>
            ) : null}

            <FeaturedLiveExamCard exam={featured} />

            {liveExams.length > 1 ? (
              <Card className="p-4 lux-surface rounded-xl border-slate-200/80">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                  Other live sessions
                </p>
                <ul className="space-y-2">
                  {liveExams.slice(1).map((exam) => (
                    <li key={exam.id}>
                      <Link
                        href={exam.href}
                        className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-[#0c2340] hover:bg-emerald-100/60 transition-colors"
                      >
                        <span className="truncate">
                          {exam.icon} {exam.title}
                        </span>
                        <span className="text-emerald-700 text-xs shrink-0">Start →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedLiveExamCard({ exam }: { exam: PortalExamItem | null }) {
  if (!exam) {
    return (
      <Card className="p-10 sm:p-12 text-center lux-surface rounded-2xl border-slate-200/80">
        <p className="text-xl font-semibold text-slate-800 font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
          No live examination right now
        </p>
        <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto leading-relaxed">
          When your exam cell opens a test window for your department, it will appear here with a
          start button. This page refreshes automatically every 15 seconds.
        </p>
      </Card>
    );
  }

  return (
    <Card className="lux-surface rounded-2xl p-6 sm:p-10 border border-emerald-400/90 ring-2 ring-emerald-500/25 shadow-xl shadow-emerald-900/10 bg-gradient-to-br from-emerald-50/90 via-white to-white">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl" aria-hidden>
              {exam.icon}
            </span>
            <Badge tone="success">LIVE</Badge>
          </div>
          <h2 className="text-2xl sm:text-[1.75rem] font-bold text-[#0c2340] leading-tight font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
            {exam.title}
          </h2>
          {exam.badge ? <p className="text-sm text-slate-500 mt-1">{exam.badge}</p> : null}
        </div>
      </div>

      <p className="text-base text-slate-700 leading-relaxed mb-5">{exam.description}</p>

      {isElevateXModule(exam.module_key) ? <ElevateXLiveInfo compact className="mb-4" /> : null}

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

      <Link href={exam.href}>
        <Button
          size="lg"
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white shadow-lg shadow-emerald-900/20 font-semibold px-8"
        >
          Start examination →
        </Button>
      </Link>
    </Card>
  );
}
