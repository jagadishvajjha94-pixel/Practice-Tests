'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type ViolationRow = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  violation_type: string;
  test_id: string | null;
  attempt_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Summary = {
  total?: number;
  byType?: Record<string, number>;
  studentsFlagged?: number;
};

export default function FacultyProctoringPage() {
  const [department, setDepartment] = useState('');
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/faculty/proctoring', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as {
          department?: string;
          violations?: ViolationRow[];
          summary?: Summary;
        };
        setDepartment(json.department ?? '');
        setRows(json.violations ?? []);
        setSummary(json.summary ?? {});
      }
      setLoading(false);
    };
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="app-eyebrow">Integrity</span>
        <h2 className="app-title-lg mt-1">Proctoring incidents</h2>
        <p className="app-subtitle">
          Live flags from <strong>{department || 'your department'}</strong> students during proctored
          exams — tab switches, camera absence, and suspicious behavior.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total incidents</p>
          <p className="text-2xl font-bold text-[#0c2340] tabular-nums mt-1">{summary.total ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Students flagged</p>
          <p className="text-2xl font-bold text-[#0c2340] tabular-nums mt-1">
            {summary.studentsFlagged ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Auto-submits</p>
          <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
            {summary.byType?.auto_submit_violations ?? 0}
          </p>
        </Card>
      </div>

      <Card className="p-6 overflow-x-auto">
        <table className="app-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Student</th>
              <th>Incident</th>
              <th>Test</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-slate-500 whitespace-nowrap text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td>
                  <p className="font-medium text-[#0c2340]">{r.full_name || 'Student'}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </td>
                <td>
                  <Badge
                    tone={
                      r.violation_type.includes('auto_submit')
                        ? 'danger'
                        : r.violation_type.includes('face')
                          ? 'warning'
                          : 'neutral'
                    }
                    className="capitalize"
                  >
                    {r.violation_type.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="text-xs text-slate-600">{r.test_id?.slice(0, 8) ?? '—'}</td>
                <td className="text-xs text-slate-500 max-w-[14rem] truncate">
                  {r.metadata ? JSON.stringify(r.metadata) : '—'}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-500">
                  No proctoring incidents yet for your department students.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
