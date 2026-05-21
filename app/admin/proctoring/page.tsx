'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { LoadingScreen } from '@/components/ui/loading-screen';

type ViolationRow = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  branch: string | null;
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
  autoSubmits?: number;
};

export default function AdminProctoringPage() {
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/proctoring', { credentials: 'include' });
    if (res.ok) {
      const json = (await res.json()) as { violations?: ViolationRow[]; summary?: Summary };
      setRows(json.violations ?? []);
      setSummary(json.summary ?? {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [live, load]);

  if (loading) {
    return <LoadingScreen message="Loading proctoring data…" className="min-h-[40vh]" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Proctoring"
        description="Exam integrity flags — tab switches, camera absence (>5s), suspicious behavior, and auto-submits after 7 incidents."
        actions={
          <div className="flex gap-2">
            <Button variant={live ? 'default' : 'outline'} size="sm" onClick={() => setLive((v) => !v)}>
              {live ? 'Live refresh on' : 'Live refresh off'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid sm:grid-cols-4 gap-3">
        <Card className="p-4 lux-surface">
          <p className="text-xs text-muted-foreground uppercase">Total incidents</p>
          <p className="text-2xl font-bold">{summary.total ?? 0}</p>
        </Card>
        <Card className="p-4 lux-surface">
          <p className="text-xs text-muted-foreground uppercase">Students flagged</p>
          <p className="text-2xl font-bold">{summary.studentsFlagged ?? 0}</p>
        </Card>
        <Card className="p-4 lux-surface">
          <p className="text-xs text-muted-foreground uppercase">Auto-submits</p>
          <p className="text-2xl font-bold text-amber-700">{summary.autoSubmits ?? summary.byType?.auto_submit_violations ?? 0}</p>
        </Card>
        {Object.entries(summary.byType ?? {})
          .filter(([t]) => !['proctor_summary'].includes(t))
          .slice(0, 3)
          .map(([type, count]) => (
            <Card key={type} className="p-4 lux-surface">
              <p className="text-xs text-muted-foreground uppercase">{type.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold">{count}</p>
            </Card>
          ))}
      </div>

      <Card className="lux-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Student</th>
                <th className="text-left p-3">Branch</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Test</th>
                <th className="text-left p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{r.full_name || r.email || '—'}</p>
                    {r.email ? <p className="text-xs text-muted-foreground">{r.email}</p> : null}
                  </td>
                  <td className="p-3 text-xs">{r.branch ?? '—'}</td>
                  <td className="p-3">
                    <Badge tone={r.violation_type.includes('auto_submit') ? 'danger' : 'warning'}>
                      {r.violation_type.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs">{r.test_id?.slice(0, 8) ?? '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                    {r.metadata ? JSON.stringify(r.metadata) : '—'}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No violations yet. Students will appear here during proctored exams on /tests/take.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
