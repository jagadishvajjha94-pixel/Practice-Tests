'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import type { FacultyExamRequest } from '@/lib/faculty-exams';
import { enrichScheduleSlots, parseScheduleSlotsJson } from '@/lib/exam-schedule-slots';
import { pendingSlotNumbers, slotStatusLabel } from '@/lib/exam-slot-approval';
import { isElevateXBuilderTestType } from '@/lib/exam-builder/elevatex-exam';
import { downloadRosterCredentialsCsv } from '@/lib/roster-credentials-export';

type EnrichedRequest = FacultyExamRequest & {
  faculty?: { full_name?: string; employee_id?: string; department?: string } | null;
  uses_slot_scheduling?: boolean;
  schedule_slots_json?: unknown;
  test_type?: string | null;
};

export default function AdminApprovalsPage() {
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/admin/exam-requests');
    if (res.ok) {
      const json = (await res.json()) as { requests: EnrichedRequest[] };
      setRequests(json.requests ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const deleteExam = async (r: EnrichedRequest) => {
    const warn =
      r.status === 'approved'
        ? `Delete "${r.title}" and remove its published test, schedules, and student attempts?`
        : `Delete pending exam "${r.title}"?`;
    if (!window.confirm(warn)) return;

    setActing(r.id);
    try {
      const res = await fetch(`/api/admin/exam-requests/${encodeURIComponent(r.id)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error ?? 'Delete failed');
        return;
      }
      await load();
    } finally {
      setActing(null);
    }
  };

  const review = async (id: string, action: 'approve' | 'reject', slotNumber?: number) => {
    const actingKey = slotNumber != null ? `${id}-slot-${slotNumber}` : id;
    setActing(actingKey);
    try {
      const res = await fetch(`/api/admin/exam-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(slotNumber != null ? { slot_number: slotNumber } : {}),
        }),
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

  const pending = requests.filter((r) => r.status === 'pending');
  const other = requests.filter((r) => r.status !== 'pending');

  if (loading) {
    return <p className="text-gray-600">Loading approvals…</p>;
  }

  return (
    <div>
      <AdminPageHeader
        title="Faculty exam approvals"
        description="Approve exams to publish them for students in the matching department and selected years."
      />

      {pending.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-slate-700 font-medium">No pending faculty exam requests</p>
          <p className="text-sm text-slate-500 mt-1">
            New submissions from faculty appear here for approval.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => {
            const allBranches = [r.department, ...(r.target_branches ?? [])];
            const questionCount = Array.isArray(r.questions_json) ? r.questions_json.length : 0;
            const isElevateX = isElevateXBuilderTestType(String(r.test_type ?? ''));
            const slotRows = enrichScheduleSlots(parseScheduleSlotsJson(r.schedule_slots_json));
            const pendingSlots = r.uses_slot_scheduling
              ? pendingSlotNumbers(parseScheduleSlotsJson(r.schedule_slots_json))
              : [];
            return (
              <Card key={r.id} className="p-6 space-y-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#0c2340] tracking-tight">
                        {r.title}
                      </h3>
                      {r.topic ? (
                        <span className="app-pill app-pill-brand">{r.topic}</span>
                      ) : null}
                      {isElevateX ? (
                        <span className="app-pill bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200">
                          🚀 ElevateX · 1 hr
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="app-pill app-pill-neutral">
                        Branches: {allBranches.join(', ')}
                      </span>
                      <span className="app-pill app-pill-neutral">
                        Years: {(r.target_years ?? []).join(', ') || 'Any'}
                      </span>
                      <span className="app-pill app-pill-neutral">
                        {r.duration_minutes} min
                      </span>
                      <span className="app-pill app-pill-neutral">
                        {isElevateX ? '6-section fixed paper' : `${questionCount} questions`}
                      </span>
                    </div>
                    {r.faculty ? (
                      <p className="text-xs text-slate-500">
                        Submitted by{' '}
                        <strong className="text-slate-700">
                          {r.faculty.full_name ?? 'Faculty'}
                        </strong>{' '}
                        ({r.faculty.employee_id ?? '—'}) ·{' '}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                    {r.uses_slot_scheduling ? (
                      pendingSlots.length > 0 ? (
                        pendingSlots.map((slotNum) => (
                          <Button
                            key={slotNum}
                            disabled={acting === `${r.id}-slot-${slotNum}`}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => review(r.id, 'approve', slotNum)}
                          >
                            Approve Slot {slotNum}
                          </Button>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 self-center">No slots pending</span>
                      )
                    ) : (
                      <Button
                        disabled={acting === r.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => review(r.id, 'approve')}
                      >
                        Approve & publish
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={acting === r.id || acting.startsWith(`${r.id}-slot-`)}
                      onClick={() => review(r.id, 'reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      disabled={acting === r.id || acting.startsWith(`${r.id}-slot-`)}
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => void deleteExam(r)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {r.description ? (
                  <p className="text-sm text-slate-700 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    {r.description}
                  </p>
                ) : null}
                {r.uses_slot_scheduling ? (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-3 text-sm space-y-2">
                    <p className="font-semibold text-indigo-950">8-slot schedule (130 students per slot)</p>
                    <ul className="grid sm:grid-cols-2 gap-2 text-xs text-indigo-900">
                      {slotRows.map((slot) => {
                        const raw = parseScheduleSlotsJson(r.schedule_slots_json).find(
                          (s) => s.slot_number === slot.slot_number,
                        );
                        const status = raw?.approval_status ?? 'draft';
                        return (
                          <li
                            key={slot.slot_number}
                            className={`rounded-md bg-white/80 border px-2 py-1.5 ${
                              status === 'approved'
                                ? 'border-emerald-200'
                                : status === 'pending'
                                  ? 'border-amber-200'
                                  : 'border-indigo-100'
                            }`}
                          >
                            <span className="font-semibold">Slot {slot.slot_number}</span>
                            <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-indigo-700/90">
                              {slotStatusLabel(status)}
                            </span>
                            <span className="block text-indigo-800/90">
                              {slot.exam_date} · {slot.start_time}–{slot.end_time}
                            </span>
                            <span className="block text-indigo-700/80">
                              {slot.roster.length} students
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[11px] text-indigo-800/80">
                      Approve one slot at a time (Slot 1, then 2, … 8). Each approval creates that
                      slot&apos;s schedule. Go live per slot on Faculty exam schedules when ready.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-indigo-300 text-indigo-900"
                      onClick={() => {
                        const slots = parseScheduleSlotsJson(r.schedule_slots_json);
                        const ok = downloadRosterCredentialsCsv(
                          slots,
                          `${r.title.replace(/[^a-zA-Z0-9_-]+/g, '_')}-credentials.csv`,
                        );
                        if (!ok) alert('No roster students found for this exam.');
                      }}
                    >
                      Download student credentials CSV
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </ul>
      )}

      {other.length > 0 ? (
        <Card className="p-6 mt-8">
          <h3 className="font-semibold text-[#0c2340] mb-4">Approved & rejected exams</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm app-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {other.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.title}</td>
                    <td>{r.department}</td>
                    <td className="capitalize">{r.status}</td>
                    <td className="text-slate-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        disabled={acting === r.id}
                        onClick={() => void deleteExam(r)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
