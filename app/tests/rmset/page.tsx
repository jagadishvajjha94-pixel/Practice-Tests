'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExamCountdown } from '@/components/student/exam-countdown';
import { RmsetExamIntro } from '@/components/rmset/rmset-exam-intro';
import type { StudentRmsetPaper } from '@/lib/rmset/types';

export default function RmsetLandingPage() {
  const router = useRouter();
  const [paper, setPaper] = useState<StudentRmsetPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/student/rmset');
      if (res.ok) {
        const json = (await res.json()) as {
          paper?: StudentRmsetPaper | null;
          message?: string;
        };
        setPaper(json.paper ?? null);
        setMessage(json.message ?? null);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const begin = () => {
    if (!paper?.test_id || !paper.is_live) return;
    router.push(`/tests/take/${paper.test_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="app-page-header bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-800 text-white border-0">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link href="/home" className="text-sm text-white/80 hover:text-white mb-4 inline-block">
            ← Back to home
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
            Tests hub · RCE-RMSET
          </p>
          <h1 className="text-4xl font-black mt-2">RMSET</h1>
          <p className="text-white/85 mt-2 max-w-2xl">
            Ramachandra Merit Scholarship Eligibility Test — Tier 4 pathway for merit-based assistance (Category B /
            non-EAPCET RMSR and invited admits).
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <Skeleton className="h-72" />
        ) : !paper ? (
          <Card className="p-8 text-center border-slate-200">
            <p className="text-lg font-semibold text-slate-800">RMSET is not available yet</p>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              {message ?? 'Your examination cell has not published or scheduled RMSET for your batch.'}
            </p>
            <Link href="/home" className="inline-block mt-6">
              <Button variant="outline">Back to home</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <RmsetExamIntro />
            </div>
            <Card className="lg:col-span-2 p-6 sm:p-8 border-2 border-violet-200">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone={paper.is_live ? 'success' : 'warning'}>
                      {paper.is_live ? 'LIVE' : 'NOT LIVE'}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-black text-[#0c2340]">{paper.title}</h2>
                </div>
                {!paper.is_live && paper.starts_at ? (
                  <ExamCountdown targetIso={paper.starts_at} label="Opens in" />
                ) : null}
              </div>

              <p className="text-slate-700 leading-relaxed mb-5">{paper.description}</p>

              {paper.notice ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Instructions</p>
                  <p className="text-sm text-slate-800">{paper.notice}</p>
                </div>
              ) : null}

              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                  Topics in this paper
                </p>
                <div className="flex flex-wrap gap-2">
                  {paper.topics.map((topic) => (
                    <span
                      key={topic.id}
                      className="rounded-full bg-violet-100 text-violet-900 px-3 py-1 text-sm font-medium"
                    >
                      {topic.name}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="text-sm text-slate-700 space-y-2 mb-6">
                <li>
                  <strong>{paper.total_questions}</strong> MCQs ·{' '}
                  <strong>{paper.questions_per_topic}</strong> per topic
                </li>
                <li>
                  <strong>{paper.duration_minutes} minutes</strong> overall timer
                </li>
                <li>Questions are drawn only from the topics selected above</li>
              </ul>

              <Button
                size="lg"
                disabled={!paper.is_live}
                className="bg-violet-700 hover:bg-violet-800"
                onClick={begin}
              >
                {paper.is_live ? 'I have read the details · Begin RMSET →' : 'Waiting for go-live'}
              </Button>
            </Card>

            <Card className="p-5 border-slate-200 h-fit">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Paper summary</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Topics</dt>
                  <dd className="font-semibold text-[#0c2340]">{paper.topics.length}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total questions</dt>
                  <dd className="font-semibold text-[#0c2340]">{paper.total_questions}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="font-semibold text-[#0c2340]">{paper.duration_minutes} min</dd>
                </div>
              </dl>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
