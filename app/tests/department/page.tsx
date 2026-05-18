'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { RoleGate } from '@/components/role-gate';

type DeptExam = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  target_years: string[];
  published_test_id: string;
  department: string;
};

export default function DepartmentExamsPage() {
  const [exams, setExams] = useState<DeptExam[]>([]);
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/student/department-exams');
      if (res.ok) {
        const json = (await res.json()) as {
          exams?: DeptExam[];
          department?: string;
          year?: string;
        };
        setExams(json.exams ?? []);
        setDepartment(json.department ?? '');
        setYear(json.year ?? '');
      }
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <RoleGate allow={['student']}>
      <div className="min-h-screen bg-background">
        <div className="app-page-header">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl font-bold text-[#0c2340]">Department exams</h1>
            <p className="text-slate-700 mt-2">
              Approved exams for {department || 'your department'}
              {year ? ` · ${year}` : ''}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {loading ? (
            <p className="text-slate-600">Loading…</p>
          ) : exams.length === 0 ? (
            <Card className="p-6 text-slate-600">
              No approved department exams for your year yet. Check back after your faculty submits and
              admin approves an exam.
            </Card>
          ) : (
            <ul className="space-y-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="p-6">
                  <h2 className="text-xl font-bold text-slate-900">{exam.title}</h2>
                  {exam.description ? (
                    <p className="text-sm text-slate-600 mt-1">{exam.description}</p>
                  ) : null}
                  <p className="text-xs text-slate-500 mt-2">
                    {exam.duration_minutes} minutes · Years: {exam.target_years.join(', ')}
                  </p>
                  <Link
                    href={`/tests/take/${exam.published_test_id}`}
                    className="inline-block mt-4 text-sm font-semibold text-[#1e3a5f] hover:underline"
                  >
                    Start exam →
                  </Link>
                </Card>
              ))}
            </ul>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
