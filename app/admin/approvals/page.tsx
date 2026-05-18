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
        <Card className="p-6 text-gray-600">No pending faculty exam requests.</Card>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => (
            <Card key={r.id} className="p-6 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{r.title}</h3>
                  <p className="text-sm text-gray-500">
                    {r.department} · {(r.target_years ?? []).join(', ')} · {r.duration_minutes} min
                  </p>
                  {r.faculty ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted by {r.faculty.full_name ?? 'Faculty'} ({r.faculty.employee_id ?? '—'})
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={acting === r.id}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => review(r.id, 'approve')}
                  >
                    Approve
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
              {r.description ? <p className="text-sm text-gray-700">{r.description}</p> : null}
              <p className="text-xs text-gray-500">
                {(Array.isArray(r.questions_json) ? r.questions_json : []).length} questions in submission
              </p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
