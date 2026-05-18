'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

type StudentRow = {
  id: string;
  email: string;
  full_name: string | null;
  branch: string | null;
  academic_year: string | null;
  attempts_count: number;
  completed_count: number;
  avg_score: number;
  recent: Array<{
    id: string;
    test_title: string;
    score: number | null;
    status: string | null;
    completed_at: string | null;
  }>;
};

export default function FacultyPerformancePage() {
  const [department, setDepartment] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, attended: 0, attempts: 0 });
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('all');

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/faculty/performance');
      if (res.ok) {
        const json = (await res.json()) as {
          department?: string;
          students?: StudentRow[];
          summary?: { students_in_department?: number; students_with_attempts?: number; total_attempts?: number };
        };
        setDepartment(json.department ?? '');
        setStudents(json.students ?? []);
        setSummary({
          total: json.summary?.students_in_department ?? 0,
          attended: json.summary?.students_with_attempts ?? 0,
          attempts: json.summary?.total_attempts ?? 0,
        });
      }
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = students.filter((s) => {
    if (filterYear === 'all') return s.attempts_count > 0;
    return s.academic_year === filterYear && s.attempts_count > 0;
  });

  if (loading) return <p className="text-slate-600">Loading performance…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Student performance</h2>
        <p className="text-slate-600 mt-1 text-sm">
          Students in <strong>{department || 'your department'}</strong> who attended approved
          department exams. You cannot view the live student exam screen.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Enrolled (dept)</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Attended exams</p>
          <p className="text-2xl font-bold">{summary.attended}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total attempts</p>
          <p className="text-2xl font-bold">{summary.attempts}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-slate-600">Filter by year:</span>
        {['all', 'I Year', 'II Year', 'III Year', 'IV Year'].map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setFilterYear(y)}
            className={`px-3 py-1 rounded-full text-sm border ${
              filterYear === y ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'border-slate-300'
            }`}
          >
            {y === 'all' ? 'All years' : y}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-slate-600 text-sm">No exam attempts yet for this filter.</Card>
      ) : (
        <ul className="space-y-4">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{s.full_name || 'Student'}</p>
                  <p className="text-xs text-slate-500">
                    {s.email} · {s.academic_year ?? 'Year N/A'}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>
                    {s.completed_count}/{s.attempts_count} completed
                  </p>
                  <p className="font-semibold text-[#1e3a5f]">Avg {s.avg_score}%</p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 border-t pt-2">
                {s.recent.map((a) => (
                  <li key={a.id}>
                    {a.test_title} — {a.status} — score {a.score ?? '—'}%
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
