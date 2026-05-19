'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { downloadStudentReportPdf } from '@/lib/reports/student-pdf';

type RecentAttempt = {
  id: string;
  test_title: string;
  topic: string | null;
  score: number | null;
  status: string | null;
  completed_at: string | null;
  created_at: string | null;
};

type StudentRow = {
  id: string;
  email: string;
  full_name: string | null;
  branch: string | null;
  academic_year: string | null;
  attempts_count: number;
  completed_count: number;
  avg_score: number;
  best_score: number;
  last_attempt_at: string | null;
  recent: RecentAttempt[];
};

type ExamStat = {
  exam_id: string;
  test_id: string;
  title: string;
  topic: string | null;
  target_years: string[];
  attempts: number;
  completed: number;
  avg_score: number;
  pass_rate: number;
};

type Bucket = { range: string; count: number };

type Summary = {
  students_in_department?: number;
  students_with_attempts?: number;
  total_attempts?: number;
  total_completed?: number;
  overall_avg?: number;
  pass_rate?: number;
};

export default function FacultyPerformancePage() {
  const [department, setDepartment] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [examStats, setExamStats] = useState<ExamStat[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/faculty/performance');
      if (res.ok) {
        const json = (await res.json()) as {
          department?: string;
          students?: StudentRow[];
          exam_stats?: ExamStat[];
          score_buckets?: Bucket[];
          summary?: Summary;
        };
        setDepartment(json.department ?? '');
        setStudents(json.students ?? []);
        setExamStats(json.exam_stats ?? []);
        setBuckets(json.score_buckets ?? []);
        setSummary(json.summary ?? {});
      }
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (filterYear !== 'all' && s.academic_year !== filterYear) return false;
        if (s.attempts_count === 0) return false;
        if (q.length === 0) return true;
        return (
          (s.full_name ?? '').toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.avg_score - a.avg_score);
  }, [students, filterYear, search]);

  const downloadStudentPdf = (s: StudentRow) => {
    downloadStudentReportPdf({
      studentName: s.full_name ?? s.email,
      email: s.email,
      generatedAt: new Date().toLocaleString(),
      overallPercent: s.avg_score,
      totalAttempts: s.attempts_count,
      avgScore: s.avg_score,
      weakTopics: s.recent
        .filter((r) => (r.score ?? 0) < 60 && r.topic)
        .map((r) => r.topic!)
        .filter((t, i, a) => a.indexOf(t) === i)
        .slice(0, 6),
      recentTests: s.recent.map((r) => ({
        name: r.test_title,
        score: Number(r.score ?? 0),
        date: r.completed_at
          ? new Date(r.completed_at).toLocaleDateString()
          : r.created_at
            ? new Date(r.created_at).toLocaleDateString()
            : '—',
      })),
    });
  };

  const exportAllCsv = () => {
    const headers = [
      'Name',
      'Email',
      'Year',
      'Attempts',
      'Completed',
      'Average score (%)',
      'Best score (%)',
      'Last attempt',
    ];
    const rows = filtered.map((s) => [
      s.full_name ?? '',
      s.email,
      s.academic_year ?? '',
      s.attempts_count,
      s.completed_count,
      s.avg_score,
      s.best_score,
      s.last_attempt_at ? new Date(s.last_attempt_at).toISOString() : '',
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? '');
            return s.includes(',') || s.includes('"')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faculty-performance-${department.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="app-eyebrow">Insights</span>
          <h2 className="app-title-lg mt-1">Student performance</h2>
          <p className="app-subtitle">
            Real-time scores from <strong>{department || 'your department'}</strong> students on
            exams you have published. Download a PDF per student or the whole list as CSV.
          </p>
        </div>
        <Button variant="outline" onClick={exportAllCsv} disabled={filtered.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Students in branch"
          value={summary.students_in_department ?? 0}
          accent="navy"
          icon="🎓"
        />
        <StatCard
          label="Attended exams"
          value={summary.students_with_attempts ?? 0}
          accent="blue"
          icon="🪪"
          hint={
            summary.students_in_department && summary.students_with_attempts
              ? `${Math.round(
                  (summary.students_with_attempts / Math.max(1, summary.students_in_department)) *
                    100,
                )}% attendance`
              : undefined
          }
        />
        <StatCard
          label="Average score"
          value={`${summary.overall_avg ?? 0}%`}
          accent="emerald"
          icon="📈"
        />
        <StatCard
          label="Pass rate (≥ 40%)"
          value={`${summary.pass_rate ?? 0}%`}
          accent={summary.pass_rate && summary.pass_rate >= 60 ? 'emerald' : 'amber'}
          icon="✅"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="app-section-title">Score distribution</h3>
              <p className="app-muted mt-0.5">
                {summary.total_completed ?? 0} completed attempts across your exams
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="app-section-title">Per-exam performance</h3>
              <p className="app-muted mt-0.5">Average score and pass rate by exam</p>
            </div>
          </div>
          {examStats.length === 0 ? (
            <div className="text-sm text-slate-500 py-10 text-center">
              No approved exams yet. Submit one from{' '}
              <a href="/faculty/upload" className="font-semibold text-[#1e3a5f] hover:underline">
                Upload exam
              </a>
              .
            </div>
          ) : (
            <div className="space-y-3">
              {examStats.map((e) => (
                <div
                  key={e.exam_id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0c2340] truncate">{e.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {e.topic ? `${e.topic} · ` : ''}
                        {e.target_years.join(', ') || 'Any year'}
                      </p>
                    </div>
                    <Badge
                      tone={e.pass_rate >= 60 ? 'success' : e.pass_rate >= 40 ? 'warning' : 'danger'}
                    >
                      {e.pass_rate}% pass
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Attempts
                      </p>
                      <p className="text-base font-bold text-[#0c2340] tabular-nums">
                        {e.attempts}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Completed
                      </p>
                      <p className="text-base font-bold text-[#0c2340] tabular-nums">
                        {e.completed}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Avg
                      </p>
                      <p className="text-base font-bold text-emerald-700 tabular-nums">
                        {e.avg_score}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="app-section-title">Students</h3>
            <p className="app-muted mt-0.5">
              {filtered.length} of {students.filter((s) => s.attempts_count > 0).length} with
              attempts
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="h-9 w-56"
            />
            <div className="flex flex-wrap gap-1.5">
              {['all', 'I Year', 'II Year', 'III Year', 'IV Year'].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setFilterYear(y)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                    filterYear === y
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {y === 'all' ? 'All years' : y}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <p className="text-slate-700 font-medium">No attempts in this view</p>
            <p className="text-sm text-slate-500 mt-1">
              Once students attempt your approved exams they appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Year</th>
                  <th>Attempts</th>
                  <th>Avg</th>
                  <th>Best</th>
                  <th>Last attempt</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <p className="font-medium text-[#0c2340]">{s.full_name || 'Student'}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[14rem]">{s.email}</p>
                    </td>
                    <td className="text-slate-700">{s.academic_year ?? '—'}</td>
                    <td className="tabular-nums text-slate-700">
                      {s.completed_count}/{s.attempts_count}
                    </td>
                    <td>
                      <span
                        className={`font-semibold tabular-nums ${
                          s.avg_score >= 60
                            ? 'text-emerald-700'
                            : s.avg_score >= 40
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {s.avg_score}%
                      </span>
                    </td>
                    <td className="tabular-nums text-slate-700">{s.best_score}%</td>
                    <td className="text-slate-500 whitespace-nowrap">
                      {s.last_attempt_at
                        ? new Date(s.last_attempt_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadStudentPdf(s)}
                      >
                        Download PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
