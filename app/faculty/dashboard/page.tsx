'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatDetailReportModal } from '@/components/reports/stat-detail-report-modal';
import {
  buildFacultyDashboardCardReport,
  type FacultyDashboardCardKey,
  type FacultyPerformanceStudent,
  type FacultyReportContext,
} from '@/lib/faculty/dashboard-card-reports';
import type { FacultyExamRequest } from '@/lib/faculty-exams';

type PerformanceSummary = {
  students_in_department?: number;
  students_with_attempts?: number;
  total_attempts?: number;
};

export default function FacultyDashboardPage() {
  const [requests, setRequests] = useState<FacultyExamRequest[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary>({});
  const [department, setDepartment] = useState('');
  const [students, setStudents] = useState<FacultyPerformanceStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [detailCard, setDetailCard] = useState<FacultyDashboardCardKey | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reloadExams = async () => {
    const examsRes = await fetch('/api/faculty/exams');
    if (examsRes.ok) {
      const json = (await examsRes.json()) as { requests: FacultyExamRequest[] };
      setRequests(json.requests ?? []);
    }
  };

  const deleteExam = async (r: FacultyExamRequest) => {
    const warn =
      r.status === 'approved'
        ? `"${r.title}" is live for students. Deleting removes the test, schedules, and attempt records. Continue?`
        : `Delete "${r.title}"? This cannot be undone.`;
    if (!window.confirm(warn)) return;

    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/faculty/exams/${encodeURIComponent(r.id)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        alert(json.error ?? 'Delete failed');
        return;
      }
      await reloadExams();
    } finally {
      setDeletingId(null);
    }
  };

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
          department?: string;
          summary?: PerformanceSummary;
          students?: FacultyPerformanceStudent[];
        };
        setDepartment(json.department ?? '');
        setSummary(json.summary ?? {});
        setStudents(json.students ?? []);
      }
      setLoading(false);
    };
    void load();
    const timer = setInterval(() => {
      void fetch('/api/faculty/performance')
        .then((perfRes) => perfRes.json())
        .then(
          (json: {
            summary?: PerformanceSummary;
            students?: FacultyPerformanceStudent[];
          }) => {
            if (json.summary) setSummary(json.summary);
            if (json.students) setStudents(json.students);
          },
        )
        .catch(() => undefined);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { pending, approved, rejected, total: requests.length };
  }, [requests]);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const facultyContext: FacultyReportContext = useMemo(
    () => ({
      department,
      summary,
      students,
      examStats: [],
      examRequests: requests,
    }),
    [department, summary, students, requests],
  );

  const detailReport = useMemo(
    () =>
      detailCard ? buildFacultyDashboardCardReport(detailCard, facultyContext) : null,
    [detailCard, facultyContext],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatDetailReportModal
        open={detailCard != null}
        onClose={() => setDetailCard(null)}
        report={detailReport}
        fileBase={detailCard ? `faculty-${detailCard}` : undefined}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="app-eyebrow">Overview</span>
          <h2 className="app-title-lg mt-1">Faculty workspace</h2>
          <p className="app-subtitle">
            Submit department exams for your branches and years. Students access only what the
            admin has approved.
          </p>
        </div>
        <Link href="/faculty/upload">
          <Button className="bg-[#1e3a5f] hover:bg-[#16304f]">+ Create exam</Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Students (your branch)"
          value={summary.students_in_department ?? 0}
          accent="navy"
          icon="🎓"
          onClick={() => setDetailCard('students_in_department')}
        />
        <StatCard
          label="Attended approved exams"
          value={summary.students_with_attempts ?? 0}
          accent="emerald"
          icon="✅"
          onClick={() => setDetailCard('students_with_attempts')}
        />
        <StatCard
          label="Total attempts"
          value={summary.total_attempts ?? 0}
          accent="blue"
          icon="📊"
          onClick={() => setDetailCard('total_attempts')}
        />
        <StatCard
          label="Approval queue"
          value={counts.pending}
          hint={counts.rejected ? `${counts.rejected} rejected` : 'All caught up'}
          accent="amber"
          icon="⏳"
          onClick={() => setDetailCard('approval_queue')}
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="app-section-title">Your exam submissions</h3>
            <p className="app-muted mt-0.5">
              {counts.total} total · {counts.approved} live · {counts.pending} awaiting approval
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                  filter === f
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <p className="text-slate-700 font-medium mb-2">No submissions in this view</p>
            <p className="text-sm text-slate-500 mb-5">
              Create a new exam and pick the branches & years it should reach.
            </p>
            <Link href="/faculty/upload">
              <Button>+ Create your first exam</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Topic</th>
                  <th>Branches</th>
                  <th>Years</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const allBranches = [r.department, ...(r.target_branches ?? [])];
                  return (
                    <tr key={r.id}>
                      <td className="font-medium text-[#0c2340] max-w-[16rem] truncate">
                        {r.title}
                      </td>
                      <td className="text-slate-700">
                        {r.topic ? r.topic : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="text-slate-700 max-w-[14rem] truncate">
                        {allBranches.join(', ')}
                      </td>
                      <td className="text-slate-700">{(r.target_years ?? []).join(', ')}</td>
                      <td className="tabular-nums text-slate-700">
                        {Array.isArray(r.questions_json) ? r.questions_json.length : 0}
                      </td>
                      <td className="tabular-nums text-slate-700">
                        {r.duration_minutes} min
                      </td>
                      <td>
                        <Badge
                          tone={
                            r.status === 'approved'
                              ? 'success'
                              : r.status === 'rejected'
                                ? 'danger'
                                : 'warning'
                          }
                          className="capitalize"
                        >
                          {r.status === 'approved'
                            ? 'Live · students can attempt'
                            : r.status === 'rejected'
                              ? 'Rejected'
                              : 'Awaiting admin'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-200 hover:bg-red-50"
                          disabled={deletingId === r.id}
                          onClick={() => void deleteExam(r)}
                        >
                          {deletingId === r.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-gradient-to-br from-[#0c2340] to-[#1e3a5f] text-white border-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
              Track impact
            </p>
            <h3 className="text-xl font-bold mt-1">Student performance & reports</h3>
            <p className="text-sm text-white/85 mt-1 max-w-xl">
              See how department exams are performing — scores, distribution, weak topics, and
              downloadable PDF reports per student.
            </p>
          </div>
          <Link href="/faculty/performance">
            <Button className="bg-white text-[#0c2340] hover:bg-slate-100 shadow-md">
              Open performance →
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
