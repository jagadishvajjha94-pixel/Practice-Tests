'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatScorePercentLabel } from '@/lib/format-score';
import { ADMIN_EXAM_TYPE_META } from '@/lib/admin/exam-type';
import { downloadTestReportPdf } from '@/lib/admin/export-test-report-pdf';
import {
  reportFiltersForTestOverview,
  scheduleLabelForTestOverview,
} from '@/lib/admin/test-overview-report';
import type { TestReportsPayload } from '@/lib/admin/test-reports-data';
import type { AdminTestOverviewItem } from '@/lib/admin/tests-overview-data';

type AdminTestDetailModalProps = {
  test: AdminTestOverviewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function statusTone(status: AdminTestOverviewItem['status']) {
  if (status === 'live') return 'success';
  if (status === 'upcoming') return 'warning';
  return 'danger';
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[140px_1fr] py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export function AdminTestDetailModal({ test, open, onOpenChange }: AdminTestDetailModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!test) return null;

  const targetDepartments =
    test.departments.length > 0 ? test.departments.join(', ') : 'All departments';
  const targetYears = test.years.length > 0 ? test.years.join(', ') : 'All years';

  const downloadExamReportPdf = async () => {
    setDownloading(true);
    try {
      const { examType, testId } = reportFiltersForTestOverview(test);
      const q = new URLSearchParams({ examType });
      if (testId) q.set('testId', testId);
      const res = await fetch(`/api/admin/test-reports?${q.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        alert('Could not load exam report data.');
        return;
      }
      const payload = (await res.json()) as TestReportsPayload;
      if (payload.rows.length === 0) {
        alert('No student attempts recorded for this exam yet.');
        return;
      }
      downloadTestReportPdf({
        examLabel: ADMIN_EXAM_TYPE_META[examType].label,
        testName: test.title,
        scheduleLabel: scheduleLabelForTestOverview(test),
        rows: payload.rows,
        summary: payload.summary,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[min(calc(100dvh-2rem),800px)] overflow-y-auto overscroll-contain flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#0c2340] pr-8">{test.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            <Badge tone="brand">{test.kind_label}</Badge>
            <Badge tone={statusTone(test.status)} className="capitalize">
              {test.status}
            </Badge>
            <span className="text-gray-500">{test.status_label}</span>
          </DialogDescription>
        </DialogHeader>

        <section className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Students attempted</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{test.students_attempted}</p>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">Completed attempts</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{test.completed_attempts}</p>
          </div>
          <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Average score</p>
            <p className="mt-1 text-2xl font-bold text-orange-900">
              {test.avg_score == null ? '—' : formatScorePercentLabel(test.avg_score)}
            </p>
          </div>
        </section>

        <dl className="mt-2">
          <DetailRow label="Schedule">
            {test.starts_at ? (
              <>
                {formatWhen(test.starts_at)}
                {test.ends_at ? ` → ${formatWhen(test.ends_at)}` : ''}
              </>
            ) : (
              'Not scheduled yet'
            )}
          </DetailRow>
          {test.duration_minutes ? (
            <DetailRow label="Duration">{test.duration_minutes} minutes</DetailRow>
          ) : null}
          {test.topic ? <DetailRow label="Topic">{test.topic}</DetailRow> : null}
          {test.faculty_department ? (
            <DetailRow label="Faculty dept">{test.faculty_department}</DetailRow>
          ) : null}
          {test.slot_number ? <DetailRow label="Slot">Slot {test.slot_number}</DetailRow> : null}
          <DetailRow label="Target departments">{targetDepartments}</DetailRow>
          <DetailRow label="Target years">{targetYears}</DetailRow>
          {test.notice ? <DetailRow label="Notice">{test.notice}</DetailRow> : null}
          {test.description ? <DetailRow label="Description">{test.description}</DetailRow> : null}
          {test.test_id ? (
            <DetailRow label="Test ID">
              <span className="font-mono text-xs">{test.test_id}</span>
            </DetailRow>
          ) : null}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="bg-[#0c2340] hover:bg-[#16304f]"
            disabled={downloading || test.total_attempts === 0}
            onClick={() => void downloadExamReportPdf()}
          >
            {downloading ? 'Preparing PDF…' : 'Download exam report (PDF)'}
          </Button>
          <Button variant="outline" asChild>
            <Link
              href={`/admin/reports?type=${reportFiltersForTestOverview(test).examType}${
                test.test_id ? `&testId=${encodeURIComponent(test.test_id)}` : ''
              }`}
            >
              Open full reports
            </Link>
          </Button>
        </div>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Departments attempted</h3>
          {test.departments_attempted.length === 0 ? (
            <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-200 p-4">
              No student attempts recorded for this test yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Department</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {test.departments_attempted.map((row) => (
                    <tr key={row.department} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 px-3 text-gray-900">{row.department}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#1e3a5f]">
                        {row.student_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
