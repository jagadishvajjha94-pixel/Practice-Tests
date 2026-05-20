'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLACEMENT_EXAM_NAME, PLACEMENT_EXAM_TAGLINE } from '@/lib/placement/config';
import { isElevateXModule } from '@/lib/elevatex';
import { ElevateXLiveInfo } from '@/components/elevatex/elevatex-live-info';
import type { StudentEvaloraModule } from '@/lib/evalora/module-schedule';

function ModuleCard({ mod, live }: { mod: StudentEvaloraModule; live: boolean }) {
  const isElevateX = isElevateXModule(mod.module_key);
  return (
    <Card className="p-5 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl shrink-0" aria-hidden>{mod.icon}</span>
          <div className="min-w-0">
            <h3 className="font-bold text-[#0c2340] truncate">{mod.title}</h3>
            {mod.badge ? <p className="text-xs text-slate-500 mt-0.5">{mod.badge}</p> : null}
          </div>
        </div>
        <Badge tone={live ? 'success' : 'warning'}>{live ? 'LIVE' : 'UPCOMING'}</Badge>
      </div>
      <p className="text-sm text-slate-600 mb-3">{mod.description}</p>
      {isElevateX && live ? <ElevateXLiveInfo compact className="mb-3" /> : null}
      {isElevateX && !live ? (
        <p className="text-xs text-slate-500 mb-3">
          Full ElevateX briefing and pattern will appear when the exam goes live.
        </p>
      ) : null}
      {mod.notice ? <p className="text-sm text-slate-700 mb-3 rounded-lg bg-slate-50 p-3 border border-slate-100">{mod.notice}</p> : null}
      <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
        <span>Starts {new Date(mod.starts_at).toLocaleString()}</span>
        {mod.ends_at ? <span>· Ends {new Date(mod.ends_at).toLocaleString()}</span> : null}
      </div>
      {live ? (
        <Link href={mod.href}>
          <Button className="w-full bg-fuchsia-700 hover:bg-fuchsia-800">Start now →</Button>
        </Link>
      ) : (
        <Button disabled className="w-full" variant="outline">
          Opens {new Date(mod.starts_at).toLocaleString()}
        </Button>
      )}
    </Card>
  );
}

export default function EvaloraHubPage() {
  const [live, setLive] = useState<StudentEvaloraModule[]>([]);
  const [upcoming, setUpcoming] = useState<StudentEvaloraModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/student/evalora-modules');
      if (res.ok) {
        const json = (await res.json()) as {
          live?: StudentEvaloraModule[];
          upcoming?: StudentEvaloraModule[];
          message?: string;
        };
        setLive(json.live ?? []);
        setUpcoming(json.upcoming ?? []);
        setMessage(json.message ?? null);
      }
      setLoading(false);
    };
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-white">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/40 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-4 py-10">
          <Link href="/home" className="text-sm text-white/80 hover:text-white mb-4 inline-block">
            ← Back to home
          </Link>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 flex items-center justify-center text-3xl shadow-lg shrink-0">
              🚀
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">Assessment portal</p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent">
                {PLACEMENT_EXAM_NAME}
              </h1>
              <p className="text-sm text-white/85 mt-1">{PLACEMENT_EXAM_TAGLINE}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {loading ? (
          <p className="text-slate-500">Loading your assessments…</p>
        ) : message ? (
          <Card className="p-6 border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-900">{message}</p>
          </Card>
        ) : null}

        {!loading && live.length === 0 && upcoming.length === 0 && !message ? (
          <Card className="p-8 text-center border-slate-200">
            <p className="text-lg font-semibold text-slate-800 mb-2">No assessments scheduled yet</p>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Psychometric, competitive, programming, department papers, and ElevateX will appear here when your
              examination cell schedules them. RMSET stays on its separate hub card.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </Card>
        ) : null}

        {live.length > 0 ? (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </span>
              <h2 className="text-xl font-bold text-[#0c2340]">Live now</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {live.map((mod) => (
                <ModuleCard key={mod.schedule_id} mod={mod} live />
              ))}
            </div>
          </section>
        ) : null}

        {upcoming.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold text-[#0c2340] mb-4">Upcoming</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {upcoming.map((mod) => (
                <ModuleCard key={mod.schedule_id} mod={mod} live={false} />
              ))}
            </div>
          </section>
        ) : null}

      </div>
    </div>
  );
}
