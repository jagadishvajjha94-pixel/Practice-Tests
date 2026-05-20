'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { ACADEMIC_YEARS, DEPARTMENTS } from '@/lib/college-brand';
import type { ExamScheduleRow } from '@/lib/exam-schedule';

type ApprovedExam = {
  id: string;
  title: string;
  topic: string | null;
  department: string;
  target_years: string[];
  target_branches: string[];
  duration_minutes: number;
  published_test_id: string;
};

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

export default function AdminExamSchedulesPage() {
  const [schedules, setSchedules] = useState<ExamScheduleRow[]>([]);
  const [approvedExams, setApprovedExams] = useState<ApprovedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [facultyExamRequestId, setFacultyExamRequestId] = useState('');
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/admin/exam-schedules');
    if (res.ok) {
      const json = (await res.json()) as {
        schedules?: ExamScheduleRow[];
        approvedExams?: ApprovedExam[];
        warnings?: string[];
      };
      setSchedules(json.schedules ?? []);
      setApprovedExams(json.approvedExams ?? []);
      setLoadWarning(json.warnings?.join(' ') ?? null);
      if (!facultyExamRequestId && json.approvedExams?.length) {
        setFacultyExamRequestId(json.approvedExams[0].id);
      }
    } else {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadWarning(json.error ?? 'Could not load exam schedules');
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const picked = approvedExams.find((e) => e.id === facultyExamRequestId);
    if (picked && !title) setTitle(picked.title);
  }, [facultyExamRequestId, approvedExams, title]);

  const act = async (id: string, action: 'go_live' | 'end') => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/exam-schedules/${id}`, {
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
    if (!facultyExamRequestId) {
      alert('Select an approved faculty exam');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyExamRequestId,
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
    return <p className="text-gray-600">Loading exam schedules…</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Live & upcoming exams"
        description="Trigger a live test for students or schedule a future exam with a notice on their dashboard."
      />

      {loadWarning ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {loadWarning}
        </p>
      ) : null}

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-[#0c2340]">Schedule or go live</h3>
        {approvedExams.length === 0 ? (
          <p className="text-sm text-slate-600">
            No approved faculty exams yet.{' '}
            <Link href="/admin/approvals" className="font-semibold text-[#1e3a5f] hover:underline">
              Approve an exam first →
            </Link>
          </p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Approved faculty exam
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={facultyExamRequestId}
                  onChange={(e) => {
                    setFacultyExamRequestId(e.target.value);
                    const picked = approvedExams.find((x) => x.id === e.target.value);
                    if (picked) setTitle(picked.title);
                  }}
                >
                  {approvedExams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} · {e.department}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dashboard title
                </label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Future notice (shown to students before go-live)
                </label>
                <Input
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  placeholder="e.g. Mid-term OS exam on Friday 10 AM — be ready with webcam"
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
              Departments/years default from the faculty exam. Students see <strong>Live test</strong>{' '}
              when you go live, and <strong>Upcoming</strong> with your notice before the start time.
            </p>
          </>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-[#0c2340] mb-4">All schedules</h3>
        {schedules.length === 0 ? (
          <p className="text-sm text-slate-500">No schedules yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
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
                    <td className="py-3 pr-3 font-medium">{s.title}</td>
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
        Target scopes: {DEPARTMENTS.slice(0, 3).join(', ')}… · Years: {ACADEMIC_YEARS.join(', ')}
      </p>
    </div>
  );
}
