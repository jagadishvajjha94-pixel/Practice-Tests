'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { ACADEMIC_YEARS, DEPARTMENTS } from '@/lib/college-brand';
import type { ExamScheduleRow } from '@/lib/exam-schedule';
import { cn } from '@/lib/utils';

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

type WizardTab = 'setup' | 'roster';

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

const SAMPLE_ROSTER_CSV = `roll_number,full_name,department,year
21CS001,Student One,Computer Science Engineering,III Year
21CS002,Student Two,Computer Science Engineering,III Year`;

export default function AdminExamSchedulesPage() {
  const [schedules, setSchedules] = useState<ExamScheduleRow[]>([]);
  const [approvedExams, setApprovedExams] = useState<ApprovedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [wizardTab, setWizardTab] = useState<WizardTab>('setup');
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

  const [facultyExamRequestId, setFacultyExamRequestId] = useState('');
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [uploadingRoster, setUploadingRoster] = useState(false);

  const loadRosterCount = useCallback(async (scheduleId: string) => {
    const r = await fetch(`/api/admin/exam-schedules/${scheduleId}/roster`, {
      credentials: 'include',
    });
    if (!r.ok) return 0;
    const body = (await r.json()) as { count?: number };
    return body.count ?? 0;
  }, []);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/exam-schedules', { credentials: 'include' });
    if (res.ok) {
      const json = (await res.json()) as {
        schedules?: ExamScheduleRow[];
        approvedExams?: ApprovedExam[];
        warnings?: string[];
      };
      const list = json.schedules ?? [];
      setSchedules(list);
      setApprovedExams(json.approvedExams ?? []);
      setLoadWarning(json.warnings?.join(' ') ?? null);
      const counts: Record<string, number> = {};
      await Promise.all(
        list.map(async (s) => {
          counts[s.id] = await loadRosterCount(s.id);
        }),
      );
      setRosterCounts(counts);
      if (!facultyExamRequestId && json.approvedExams?.length) {
        setFacultyExamRequestId(json.approvedExams[0].id);
      }
    } else {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadWarning(json.error ?? 'Could not load exam schedules');
    }
    setLoading(false);
  }, [facultyExamRequestId, loadRosterCount]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const picked = approvedExams.find((e) => e.id === facultyExamRequestId);
    if (picked && !title) setTitle(picked.title);
  }, [facultyExamRequestId, approvedExams, title]);

  const activeSchedule = useMemo(
    () => schedules.find((s) => s.id === activeScheduleId) ?? null,
    [schedules, activeScheduleId],
  );

  const activeRosterCount = activeScheduleId ? (rosterCounts[activeScheduleId] ?? 0) : 0;

  const openRosterForSchedule = (scheduleId: string) => {
    setActiveScheduleId(scheduleId);
    setWizardTab('roster');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const act = async (id: string, action: 'go_live' | 'end') => {
    if (action === 'go_live' && (rosterCounts[id] ?? 0) === 0) {
      alert('Upload the student roster first (Student roster tab), then go live.');
      openRosterForSchedule(id);
      return;
    }
    setActing(id);
    try {
      const res = await fetch(`/api/admin/exam-schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        alert(json.error ?? 'Action failed');
        return;
      }
      await load();
      if (action === 'go_live' && id === activeScheduleId) {
        setWizardTab('setup');
      }
    } finally {
      setActing(null);
    }
  };

  const saveDraftSchedule = async () => {
    if (!facultyExamRequestId) {
      alert('Select an approved faculty exam');
      return;
    }
    setSavingDraft(true);
    try {
      const res = await fetch('/api/admin/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          facultyExamRequestId,
          title: title.trim() || undefined,
          notice: notice.trim() || undefined,
          startsAt: fromLocalInputValue(startsAt) ?? new Date().toISOString(),
          endsAt: fromLocalInputValue(endsAt),
          goLiveNow: false,
        }),
      });
      const json = (await res.json()) as { error?: string; schedule?: ExamScheduleRow };
      if (!res.ok) {
        alert(json.error ?? 'Could not save draft');
        return;
      }
      const scheduleId = json.schedule?.id;
      if (scheduleId) {
        setActiveScheduleId(scheduleId);
        setRosterCounts((prev) => ({ ...prev, [scheduleId]: 0 }));
        setWizardTab('roster');
      }
      await load();
    } finally {
      setSavingDraft(false);
    }
  };

  const uploadRoster = async (file: File) => {
    if (!activeScheduleId) {
      alert('Save exam details first (step 1), then upload the roster.');
      setWizardTab('setup');
      return;
    }
    setUploadingRoster(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('replace', 'true');
      const res = await fetch(`/api/admin/exam-schedules/${activeScheduleId}/roster`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const json = (await res.json()) as { error?: string; imported?: number; parseErrors?: string[] };
      if (!res.ok) {
        alert(json.error ?? 'Roster upload failed');
        return;
      }
      const imported = json.imported ?? 0;
      setRosterCounts((prev) => ({ ...prev, [activeScheduleId]: imported }));
      alert(
        `Imported ${imported} students.${json.parseErrors?.length ? ` ${json.parseErrors.length} row warnings.` : ''} You can now go live.`,
      );
      await load();
    } finally {
      setUploadingRoster(false);
    }
  };

  if (loading) {
    return <p className="text-gray-600">Loading exam schedules…</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Live & upcoming exams"
        description="Step 1: exam details · Step 2: upload student roster · Step 3: go live (only rostered rolls can take the test)."
      />

      {loadWarning ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {loadWarning}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/80">
          {(
            [
              { id: 'setup' as const, label: '1. Exam details', hint: 'Title, timing, notice' },
              { id: 'roster' as const, label: '2. Student roster', hint: 'CSV before go live' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'roster' && !activeScheduleId) {
                  alert('Complete step 1 and save draft first.');
                  return;
                }
                setWizardTab(tab.id);
              }}
              className={cn(
                'flex-1 px-4 py-3 text-left transition border-b-2',
                wizardTab === tab.id
                  ? 'border-[#1e3a5f] bg-white text-[#0c2340]'
                  : 'border-transparent text-slate-600 hover:bg-white/60',
              )}
            >
              <span className="text-sm font-semibold block">{tab.label}</span>
              <span className="text-[10px] text-slate-500">{tab.hint}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {wizardTab === 'setup' ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-[#0c2340]">Exam details (draft)</h3>
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
                        Notice (shown before go-live)
                      </label>
                      <Input
                        value={notice}
                        onChange={(e) => setNotice(e.target.value)}
                        placeholder="e.g. Mid-term exam Friday 10 AM — webcam required"
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
                    <Button disabled={savingDraft} onClick={() => void saveDraftSchedule()}>
                      {savingDraft ? 'Saving…' : 'Save draft & continue to roster →'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    The exam stays <strong>scheduled</strong> until you upload the roster and press{' '}
                    <strong>Go live</strong> on the next tab.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#0c2340]">Student roster (required before go live)</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {activeSchedule ? (
                      <>
                        Draft: <strong>{activeSchedule.title}</strong> ·{' '}
                        <span className="capitalize">{activeSchedule.status}</span>
                      </>
                    ) : (
                      'Select a draft from the table below or save step 1 first.'
                    )}
                  </p>
                </div>
                {activeScheduleId ? (
                  <Badge tone={activeRosterCount > 0 ? 'success' : 'warning'}>
                    {activeRosterCount} students on roster
                  </Badge>
                ) : null}
              </div>

              {activeScheduleId ? (
                <>
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-800 mb-2">Upload CSV</p>
                    <p className="text-xs text-slate-600 mb-3">
                      Columns: <code className="bg-white px-1 rounded">roll_number</code>,{' '}
                      <code className="bg-white px-1 rounded">full_name</code>,{' '}
                      <code className="bg-white px-1 rounded">department</code>,{' '}
                      <code className="bg-white px-1 rounded">year</code>
                    </p>
                    <div>
                      <input
                        id="roster-csv-upload"
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        disabled={uploadingRoster}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadRoster(f);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingRoster}
                        onClick={() => document.getElementById('roster-csv-upload')?.click()}
                      >
                        {uploadingRoster ? 'Uploading…' : 'Choose CSV file'}
                      </Button>
                    </div>
                  </div>

                  <details className="text-xs text-slate-600">
                    <summary className="cursor-pointer font-semibold text-[#1e3a5f]">
                      Sample CSV format
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-100 rounded-lg overflow-x-auto text-[11px]">
                      {SAMPLE_ROSTER_CSV}
                    </pre>
                  </details>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={
                        acting === activeScheduleId ||
                        activeRosterCount === 0 ||
                        activeSchedule?.status === 'live'
                      }
                      onClick={() => void act(activeScheduleId, 'go_live')}
                    >
                      {activeSchedule?.status === 'live'
                        ? 'Already live'
                        : acting === activeScheduleId
                          ? 'Going live…'
                          : 'Go live now'}
                    </Button>
                    {activeRosterCount === 0 ? (
                      <p className="text-xs text-amber-800 self-center">
                        Upload at least one student before going live.
                      </p>
                    ) : null}
                    {activeSchedule?.status === 'live' ? (
                      <Button
                        variant="outline"
                        disabled={acting === activeScheduleId}
                        onClick={() => void act(activeScheduleId, 'end')}
                      >
                        End examination
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Go to <strong>Exam details</strong> and click &quot;Save draft & continue to roster&quot;,
                  or pick a scheduled exam below and click <strong>Roster</strong>.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-[#0c2340] mb-4">All schedules</h3>
        {schedules.length === 0 ? (
          <p className="text-sm text-slate-500">No schedules yet. Use step 1 above to create a draft.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Roster</th>
                  <th className="py-2 pr-3">Starts</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const count = rosterCounts[s.id] ?? 0;
                  const canGoLive = s.status === 'scheduled' && count > 0;
                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        'border-b border-slate-100',
                        s.id === activeScheduleId && 'bg-blue-50/40',
                      )}
                    >
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
                      <td className="py-3 pr-3 tabular-nums">
                        <span className={count > 0 ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
                          {count} students
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-600 whitespace-nowrap">
                        {new Date(s.starts_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.status !== 'live' ? (
                            <Button size="sm" variant="outline" onClick={() => openRosterForSchedule(s.id)}>
                              Roster
                            </Button>
                          ) : null}
                          {s.status === 'scheduled' ? (
                            <Button
                              size="sm"
                              disabled={acting === s.id || !canGoLive}
                              title={
                                !canGoLive ? 'Upload roster first' : 'Make exam live for rostered students'
                              }
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
                  );
                })}
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
