'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FacultyExamRequest } from '@/lib/faculty-exams';

export default function FacultyDashboardPage() {
  const [requests, setRequests] = useState<FacultyExamRequest[]>([]);
  const [summary, setSummary] = useState({ students: 0, withAttempts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [examsRes, perfRes] = await Promise.all([
        fetch('/api/faculty/exams'),
        fetch('/api/faculty/performance'),
      ]);
      if (examsRes.ok) {
        const json = (await examsRes.json()) as { requests: FacultyExamRequest[] };
        setRequests(json.requests ?? []);
      }
      if (perfRes.ok) {
        const json = (await perfRes.json()) as {
          summary?: { students_in_department?: number; students_with_attempts?: number };
        };
        setSummary({
          students: json.summary?.students_in_department ?? 0,
          withAttempts: json.summary?.students_with_attempts ?? 0,
        });
      }
      setLoading(false);
    };
    void load();
  }, []);

  const pending = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => r.status === 'approved').length;

  if (loading) {
    return <p className="text-slate-600">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Faculty dashboard</h2>
        <p className="text-slate-600 mt-1">
          Upload department exams for selected years. Students see tests only after admin approval.
          You cannot access the student exam interface.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Students in your department</p>
          <p className="text-3xl font-bold text-slate-900">{summary.students}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Attended approved exams</p>
          <p className="text-3xl font-bold text-slate-900">{summary.withAttempts}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Exam requests</p>
          <p className="text-3xl font-bold text-slate-900">
            {pending} pending · {approved} live
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Your exam submissions</h3>
          <Link href="/faculty/upload">
            <Button className="bg-[#1e3a5f] hover:bg-[#16304f]">Upload new exam</Button>
          </Link>
        </div>
        {requests.length === 0 ? (
          <p className="text-slate-600 text-sm">No submissions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {requests.map((r) => (
              <li key={r.id} className="py-3 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    Years: {(r.target_years ?? []).join(', ')} · {r.duration_minutes} min
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                    r.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
