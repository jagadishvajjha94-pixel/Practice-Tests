'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const POLL_MS = 3000;

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

type LiveWritingEntry = LiveBoardEntry & {
  schedule_id: string;
  schedule_title: string;
  test_title: string;
};

export function LiveExamDashboard() {
  const [schedules, setSchedules] = useState<LiveSchedule[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [board, setBoard] = useState<LiveBoard | null>(null);
  const [writingNow, setWritingNow] = useState<LiveWritingEntry[]>([]);
  const [live, setLive] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (scheduleId: string) => {
    const q = scheduleId ? `?scheduleId=${encodeURIComponent(scheduleId)}` : '';
    const res = await fetch(`/api/admin/live-dashboard${q}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return;
    const json = (await res.json()) as {
      live?: boolean;
      schedules?: LiveSchedule[];
      board?: LiveBoard | null;
      writing_now?: LiveWritingEntry[];
      refreshed_at?: string;
    };

    const list = json.schedules ?? [];
    const isLive = Boolean(json.live) && list.length > 0;
    setLive(isLive);
    setSchedules(list);
    setRefreshedAt(json.refreshed_at ?? new Date().toISOString());
    setLoading(false);

    if (!isLive) {
      setBoard(null);
      setWritingNow([]);
      setSelectedId('');
      return;
    }

    const requestedOk = scheduleId && list.some((s) => s.id === scheduleId);
    if (!requestedOk && list[0]) {
      setSelectedId(list[0].id);
      return;
    }

    setBoard(json.board ?? null);
    setWritingNow(json.writing_now ?? []);
  }, []);

  useEffect(() => {
    void refresh(selectedId);
  }, [selectedId, refresh]);

  useEffect(() => {
    if (!live || !selectedId) return;
    const timer = setInterval(() => void refresh(selectedId), POLL_MS);
    return () => clearInterval(timer);
  }, [live, selectedId, refresh]);

  useEffect(() => {
    void refresh('');
  }, [refresh]);

  if (loading && !live) {
    return null;
  }

  if (!live || schedules.length === 0) {
    return null;
  }

  const entries = board?.entries ?? [];
  const activeSchedule = schedules.find((s) => s.id === selectedId) ?? schedules[0];

  return (
    <Card className="mb-8 overflow-hidden border-0 shadow-[0_20px_48px_-12px_rgba(8,26,50,0.35)]">
      <div className="relative bg-gradient-to-br from-[#081a32] via-[#0f2d4d] to-[#163d63] text-white p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c4a052]/70 to-transparent"
          aria-hidden
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-200/95">
              Live leaderboard
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white tracking-tight font-[family-name:var(--font-display),ui-serif,Georgia,serif] truncate">
              {board?.test_title ?? board?.schedule?.title ?? activeSchedule?.title ?? 'Live exam'}
            </h2>
            {schedules.length > 1 ? (
              <p className="text-xs text-slate-300/80 mt-1">
                {schedules.length} examinations live · updates every {POLL_MS / 1000}s
              </p>
            ) : (
              <p className="text-xs text-slate-300/80 mt-1">Auto-refresh every {POLL_MS / 1000}s</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 shrink-0 w-full lg:w-auto lg:min-w-[280px]">
            <div className="flex-1 min-w-0">
              <Label htmlFor="live-exam-select" className="text-[10px] uppercase tracking-wider text-slate-300/90 mb-1 block">
                Select live test
              </Label>
              <select
                id="live-exam-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-amber-300/50"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900">
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/50 px-3 py-1.5 text-xs font-bold text-emerald-200 animate-pulse self-start sm:self-auto whitespace-nowrap">
              LIVE
            </span>
          </div>
        </div>

        {writingNow.length > 0 ? (
          <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200/95 mb-3">
              Currently writing (all live exams)
            </p>
            <ul className="space-y-2 max-h-[200px] overflow-y-auto">
              {writingNow.map((row) => (
                <li
                  key={`${row.schedule_id}-${row.attempt_id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{row.student_name}</p>
                    <p className="text-xs text-cyan-100/80 font-mono">{row.roll_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-amber-200/95 truncate max-w-[200px] sm:max-w-xs">
                      {row.test_title}
                    </p>
                    <p className="text-[10px] text-slate-300/70">In exam now</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3 mb-6 max-w-xl">
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center border border-[#c4a052]/25 backdrop-blur-sm">
            <p className="text-2xl font-bold text-amber-200 tabular-nums">{entries.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-200/80">On board</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center border border-emerald-400/25 backdrop-blur-sm">
            <p className="text-2xl font-bold text-emerald-200 tabular-nums">{board?.submitted_count ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-200/80">Submitted</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center border border-cyan-400/25 backdrop-blur-sm">
            <p className="text-2xl font-bold text-cyan-200 tabular-nums">{board?.in_progress_count ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-200/80">In progress</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/20 overflow-hidden backdrop-blur-sm">
          <div className="hidden sm:grid sm:grid-cols-[3rem_1fr_7rem_5rem_8rem] gap-2 px-4 py-3 bg-[#c4a052]/12 text-xs font-bold uppercase tracking-wider text-amber-100/95 border-b border-white/10">
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
            <ul className="max-h-[min(420px,50vh)] overflow-y-auto divide-y divide-white/5">
              {entries.map((entry, idx) => {
                const isTop = idx < 3;
                const submitted = entry.submitted_at
                  ? new Date(entry.submitted_at).toLocaleTimeString()
                  : 'In exam';
                return (
                  <li
                    key={entry.attempt_id}
                    className={cn(
                      'px-4 py-3 transition-colors',
                      isTop && 'bg-[#c4a052]/10',
                      !entry.submitted_at && 'bg-cyan-500/8',
                    )}
                  >
                    <div
                      className={cn(
                        'sm:grid sm:gap-2 sm:items-center',
                        schedules.length > 1
                          ? 'sm:grid-cols-[3rem_1fr_7rem_6rem_5rem_8rem]'
                          : 'sm:grid-cols-[3rem_1fr_7rem_5rem_8rem]',
                      )}
                    >
                      <span
                        className={cn(
                          'text-lg font-black tabular-nums inline-block sm:block',
                          idx === 0 && 'text-amber-300',
                          idx === 1 && 'text-slate-200',
                          idx === 2 && 'text-amber-600/90',
                          idx > 2 && 'text-slate-300/90',
                        )}
                      >
                        #{entry.rank}
                      </span>
                      <div className="mt-1 sm:mt-0 min-w-0">
                        <p className="font-semibold text-white truncate">{entry.student_name}</p>
                        <p className="text-xs text-slate-300/80 font-mono truncate sm:hidden">
                          {entry.roll_number}
                        </p>
                      </div>
                      <span className="hidden sm:block text-sm text-slate-200/90 font-mono truncate">
                        {entry.roll_number}
                      </span>
                      {schedules.length > 1 ? (
                        <span className="hidden sm:block text-xs text-amber-100/90 truncate">
                          {board?.test_title ?? activeSchedule?.title ?? '—'}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'text-xl font-black tabular-nums block mt-1 sm:mt-0 sm:text-right',
                          entry.score >= 80 ? 'text-emerald-300' : entry.score >= 40 ? 'text-amber-300' : 'text-rose-300',
                        )}
                      >
                        {entry.score}%
                      </span>
                      <span className="text-xs text-slate-200/80 tabular-nums block sm:text-right mt-0.5 sm:mt-0">
                        {submitted}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {refreshedAt ? (
          <p className="text-[10px] text-slate-300/55 mt-3 text-right tabular-nums">
            Auto-refresh · last update {new Date(refreshedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
