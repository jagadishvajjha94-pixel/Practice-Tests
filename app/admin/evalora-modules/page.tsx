'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { ACADEMIC_YEARS, DEPARTMENTS } from '@/lib/college-brand';
import type { EvaloraModuleDef } from '@/lib/evalora/modules';
import type { EvaloraModuleScheduleRow } from '@/lib/evalora/module-schedule';

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminEvaloraModulesPage() {
  const [modules, setModules] = useState<EvaloraModuleDef[]>([]);
  const [schedules, setSchedules] = useState<EvaloraModuleScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [moduleKey, setModuleKey] = useState('psychometric');
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/evalora-modules');
    if (res.ok) {
      const json = (await res.json()) as {
        modules?: EvaloraModuleDef[];
        schedules?: EvaloraModuleScheduleRow[];
      };
      setModules(json.modules ?? []);
      setSchedules(json.schedules ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const picked = modules.find((m) => m.key === moduleKey);
    if (picked && !title) setTitle(picked.name);
  }, [moduleKey, modules, title]);

  const act = async (id: string, action: 'go_live' | 'end') => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/evalora-modules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        alert(json.error ?? 'Action failed');
        return;
      }
      await load();
    } finally {
      setActing(null);
    }
  };

  const createSchedule = async (goLiveNow: boolean) => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/evalora-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleKey,
          title: title.trim() || undefined,
          notice: notice.trim() || undefined,
          startsAt: fromLocalInputValue(startsAt) ?? new Date().toISOString(),
          endsAt: fromLocalInputValue(endsAt),
          goLiveNow,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        alert(json.error ?? 'Could not create schedule');
        return;
      }
      setNotice('');
      setStartsAt('');
      setEndsAt('');
      await load();
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="text-gray-600">Loading assessment modules…</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="ElevateX & assessment modules"
        description="Schedule or go live with ElevateX and other assessments. Students open /placement to see only what you trigger."
      />

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-[#0c2340]">Schedule or go live</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Module
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={moduleKey}
              onChange={(e) => {
                setModuleKey(e.target.value);
                const picked = modules.find((m) => m.key === e.target.value);
                if (picked) setTitle(picked.name);
              }}
            >
              {modules.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.icon} {m.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {modules.find((m) => m.key === moduleKey)?.description}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Student-facing title
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notice (shown before / during window)
            </label>
            <Input
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              placeholder="e.g. Mid-term psychometric — webcam required"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Starts at
            </label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ends at (optional)
            </label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button disabled={creating} onClick={() => void createSchedule(true)}>
            Go live now
          </Button>
          <Button variant="outline" disabled={creating} onClick={() => void createSchedule(false)}>
            Save as upcoming
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Students see live modules on <Link href="/placement" className="underline">/placement</Link> and their
          dashboard.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-[#0c2340] mb-4">All module schedules</h3>
        {schedules.length === 0 ? (
          <p className="text-sm text-slate-500">No schedules yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-3">Module</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Starts</th>
                  <th className="py-2 pr-3">Ends</th>
                  <th className="py-2 pr-3">Notice</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-mono text-xs">{s.module_key}</td>
                    <td className="py-3 pr-3 font-medium">{s.title ?? '—'}</td>
                    <td className="py-3 pr-3">
                      <Badge
                        tone={
                          s.status === 'live'
                            ? 'success'
                            : s.status === 'scheduled'
                              ? 'warning'
                              : 'neutral'
                        }
                        className="capitalize"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-slate-600 whitespace-nowrap">
                      {new Date(s.starts_at).toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 text-slate-600 whitespace-nowrap">
                      {s.ends_at ? new Date(s.ends_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-3 text-slate-500 max-w-[12rem] truncate">
                      {s.notice ?? '—'}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.status !== 'live' ? (
                          <Button
                            size="sm"
                            disabled={acting === s.id}
                            onClick={() => void act(s.id, 'go_live')}
                          >
                            Go live
                          </Button>
                        ) : null}
                        {s.status === 'live' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting === s.id}
                            onClick={() => void act(s.id, 'end')}
                          >
                            End
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        Faculty department papers: use{' '}
        <Link href="/admin/exam-schedules" className="underline">
          Faculty exam schedules
        </Link>{' '}
        when the department module is live. Years: {ACADEMIC_YEARS.join(', ')}.
      </p>
    </div>
  );
}