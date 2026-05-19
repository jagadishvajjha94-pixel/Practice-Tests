'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGate } from '@/components/role-gate';

type DeptExam = {
  id: string;
  title: string;
  topic: string | null;
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
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/student/department-exams');
      if (res.ok) {
        const json = (await res.json()) as {
          exams?: DeptExam[];
          department?: string;
          year?: string;
          message?: string;
        };
        setExams(json.exams ?? []);
        setDepartment(json.department ?? '');
        setYear(json.year ?? '');
        setMessage(json.message ?? null);
      }
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <RoleGate allow={['student']}>
      <div className="app-page">
        <header className="app-page-header">
          <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <span className="app-eyebrow">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Faculty-approved
              </span>
              <h1 className="app-title-xl">Department exams</h1>
              <p className="app-subtitle">
                Exams assigned to your branch and year by your faculty and approved by the
                examination cell. Locked until both steps complete.
              </p>
            </div>
            {department || year ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Your scope
                </p>
                <p className="font-semibold text-[#0c2340] truncate max-w-[18rem]">
                  {department || '—'}
                </p>
                <p className="text-slate-600">{year || '—'}</p>
              </div>
            ) : null}
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : message ? (
            <Card className="p-8 text-center">
              <p className="text-3xl mb-3" aria-hidden>
                🪪
              </p>
              <p className="font-semibold text-[#0c2340] text-lg">Complete your profile</p>
              <p className="text-sm text-slate-600 mt-1 mb-5 max-w-md mx-auto">
                Your department and academic year must be set so the system can match you to the
                right exams.
              </p>
              <Link href="/profile">
                <Button>Update profile</Button>
              </Link>
            </Card>
          ) : exams.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-4xl mb-3" aria-hidden>
                🔒
              </p>
              <p className="font-semibold text-[#0c2340] text-lg">
                No exams assigned to you yet
              </p>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Your faculty has not assigned (or admin has not yet approved) any department exams
                for <strong>{department || 'your branch'}</strong> ·{' '}
                <strong>{year || 'your year'}</strong>. Check back soon — you will be notified
                here when one becomes available.
              </p>
              <div className="mt-6">
                <Link href="/tests">
                  <Button variant="outline">← Back to practice tests</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="p-6 app-card-hover">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-[#0c2340] tracking-tight truncate">
                        {exam.title}
                      </h2>
                      {exam.topic ? (
                        <p className="text-sm text-slate-600 mt-0.5 truncate">{exam.topic}</p>
                      ) : null}
                    </div>
                    <Badge tone="success">Unlocked</Badge>
                  </div>
                  {exam.description ? (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{exam.description}</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-slate-500">
                        Duration
                      </p>
                      <p className="text-sm font-bold text-[#0c2340] tabular-nums mt-0.5">
                        {exam.duration_minutes} min
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-slate-500">
                        Years
                      </p>
                      <p className="text-sm font-bold text-[#0c2340] mt-0.5">
                        {exam.target_years.join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                  <Link href={`/tests/take/${exam.published_test_id}`} className="block mt-4">
                    <Button className="w-full">Start exam →</Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
