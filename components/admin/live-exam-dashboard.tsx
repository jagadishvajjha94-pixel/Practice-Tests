'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type LiveSchedule = {
  id: string;
  title: string;
  test_id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
};

type LiveBoardEntry = {
  attempt_id: string;
  roll_number: string;
  student_name: string;
  score: number;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  rank: number;
};

type LiveBoard = {
  schedule: LiveSchedule;
  test_title: string;
  entries: LiveBoardEntry[];
  submitted_count: number;
  in_progress_count: number;
};

export function LiveExamDashboard() {
  const [schedules, setSchedules] = useState<LiveSchedule[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [board, setBoard] = useState<LiveBoard | null>(null);
  const [live, setLive] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const load = useCallback(async (scheduleId?: string) => {
    const q = scheduleId ? `?scheduleId=${encodeURIComponent(scheduleId)}` : '';
    const res = await fetch(`/api/admin/live-dashboard${q}`, { credentials: 'include' });
    if (!res.ok) return;
    const json = (await res.json()) as {
      live?: boolean;
      schedules?: LiveSchedule[];
      board?: LiveBoard | null;
      refreshed_at?: string;
    };
    setLive(Boolean(json.live));
    setSchedules(json.schedules ?? []);
    setBoard(json.board ?? null);
    setRefreshedAt(json.refreshed_at ?? new Date().toISOString());
    if (!selectedId && json.schedules?.[0]?.id) {
      setSelectedId(json.schedules[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    void load(selectedId || undefined);
    const timer = setInterval(() => {
      void load(selectedId || undefined);
    }, 2500);
    return () => clearInterval(timer);
  }, [load, selectedId]);

  if (!live || schedules.length === 0) {
    return null;
  }

  const entries = board?.entries ?? [];

  return (
    <Card className="mb-8 overflow-hidden border-0 shadow-2xl">
      <div className="bg-gradient-to-br from-[#0a0f2e] via-[#1a0a3e] to-[#2d1060] text-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">
              Leaderboard
            </p>
            <h2 className="text-2xl sm:text-3xl font-black mt-1 text-amber-100">
              {board?.test_title ?? board?.schedule?.title ?? 'Live exam'}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {schedules.length > 1 ? (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-lg border border-violet-400/40 bg-violet-950/60 px-3 py-2 text-sm text-white"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/50 px-3 py-1 text-xs font-bold text-emerald-200 animate-pulse">
              LIVE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6 max-w-xl">
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center border border-amber-400/20">
            <p className="text-2xl font-black text-amber-300">{entries.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-violet-200">On board</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center border border-emerald-400/20">
            <p className="text-2xl font-black text-emerald-300">{board?.submitted_count ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-violet-200">Submitted</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center border border-cyan-400/20">
            <p className="text-2xl font-black text-cyan-300">{board?.in_progress_count ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-violet-200">In progress</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-black/25 overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_6rem_6rem_8rem] sm:grid-cols-[3rem_1fr_7rem_7rem_10rem] gap-2 px-4 py-3 bg-amber-500/15 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-200 border-b border-amber-400/20">
            <span>#</span>
            <span>Student</span>
            <span>Roll</span>
            <span className="text-right">Score</span>
            <span className="text-right">Submitted</span>
          </div>
          {entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-violet-200/80 text-sm">
              Waiting for the first submission…
            </p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
              {entries.map((entry, idx) => {
                const isTop = idx < 3;
                const submitted = entry.submitted_at
                  ? new Date(entry.submitted_at).toLocaleTimeString()
                  : 'In exam';
                return (
                  <li
                    key={entry.attempt_id}
                    className={cn(
                      'grid grid-cols-[3rem_1fr_6rem_6rem_8rem] sm:grid-cols-[3rem_1fr_7rem_7rem_10rem] gap-2 px-4 py-3 items-center transition-colors',
                      isTop && 'bg-amber-500/10',
                      !entry.submitted_at && 'bg-cyan-500/5',
                    )}
                  >
                    <span
                      className={cn(
                        'text-lg font-black tabular-nums',
                        idx === 0 && 'text-amber-300',
                        idx === 1 && 'text-slate-200',
                        idx === 2 && 'text-amber-600/90',
                        idx > 2 && 'text-violet-300/80',
                      )}
                    >
                      {entry.rank}
                    </span>
                    <span className="font-semibold text-white truncate">{entry.student_name}</span>
                    <span className="text-sm text-violet-200 font-mono truncate">{entry.roll_number}</span>
                    <span
                      className={cn(
                        'text-right text-xl font-black tabular-nums',
                        entry.score >= 80 ? 'text-emerald-300' : entry.score >= 40 ? 'text-amber-300' : 'text-rose-300',
                      )}
                    >
                      {entry.score}%
                    </span>
                    <span className="text-right text-xs text-violet-200/90 tabular-nums">{submitted}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {refreshedAt ? (
          <p className="text-[10px] text-violet-300/60 mt-3 text-right">
            Auto-refresh · last update {new Date(refreshedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
