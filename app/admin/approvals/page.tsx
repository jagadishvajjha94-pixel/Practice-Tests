'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import type { FacultyExamRequest } from '@/lib/faculty-exams';

type EnrichedRequest = FacultyExamRequest & {
  faculty?: { full_name?: string; employee_id?: string; department?: string } | null;
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

  const review = async (id: string, action: 'approve' | 'reject') => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/exam-requests/${id}`, {
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

  const pending = requests.filter((r) => r.status === 'pending');

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
                        {questionCount} questions
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
                  <div className="flex gap-2 shrink-0">
                    <Button
                      disabled={acting === r.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => review(r.id, 'approve')}
                    >
                      Approve & publish
                    </Button>
                    <Button
                      variant="outline"
                      disabled={acting === r.id}
                      onClick={() => review(r.id, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
                {r.description ? (
                  <p className="text-sm text-slate-700 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    {r.description}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
