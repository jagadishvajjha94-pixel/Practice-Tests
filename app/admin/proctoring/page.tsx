'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type ViolationRow = {
  id: string;
  violation_type: string;
  test_id: string | null;
  attempt_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  users?: { email?: string; full_name?: string | null } | null;
};

export default function AdminProctoringPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('exam_violations')
      .select('*, users(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    setRows((data as ViolationRow[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [live, load]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.violation_type] = (acc[r.violation_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proctoring</h2>
          <p className="text-sm text-gray-600 mt-1">Review integrity flags and live exam violation events.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={live ? 'default' : 'outline'} size="sm" onClick={() => setLive((v) => !v)}>
            {live ? 'Live refresh on' : 'Live refresh off'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
          </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {Object.entries(byType).map(([type, count]) => (
          <Card key={type} className="p-4 lux-surface">
            <p className="text-xs text-muted-foreground uppercase">{type.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold text-foreground">{count}</p>
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
                  <td className="p-3">{r.users?.email ?? '—'}</td>
                  <td className="p-3 font-medium text-amber-200">{r.violation_type}</td>
                  <td className="p-3 text-xs">{r.test_id?.slice(0, 8) ?? '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                    {r.metadata ? JSON.stringify(r.metadata) : '—'}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No violations yet. Start an exam with proctoring enabled on /tests/take.
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
