'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { findDepartment } from '@/lib/placement/config';
import { loadScorecardForAttempt } from '@/lib/placement/session';
import type { PlacementScorecard } from '@/lib/placement/types';

function formatHms(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const READINESS_COLORS: Record<PlacementScorecard['placementReadiness'], string> = {
  Excellent: 'bg-emerald-500',
  Strong: 'bg-emerald-400',
  Developing: 'bg-amber-500',
  'Needs work': 'bg-red-500',
};

export default function PlacementResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const [scorecard, setScorecard] = useState<PlacementScorecard | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const loaded = loadScorecardForAttempt<PlacementScorecard & { attemptId?: string }>(attemptId);
    if (!loaded) {
      setMissing(true);
      return;
    }
    setScorecard(loaded);
  }, [attemptId]);

  const dept = useMemo(
    () => (scorecard ? findDepartment(scorecard.candidate.departmentId) : null),
    [scorecard],
  );

  if (missing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-slate-700">
          We could not find a stored scorecard for this attempt on this device.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Generating scorecard…</p>
      </div>
    );
  }

  const readinessClass = READINESS_COLORS[scorecard.placementReadiness];

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <Card className="p-6 sm:p-8 shadow-md border-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {scorecard.candidate.collegeName ?? 'Campus Assessment'}
              </p>
              <h1 className="text-3xl font-bold mt-1 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Evalora Scorecard
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {scorecard.candidate.fullName} · <span className="font-mono">{scorecard.candidate.hallTicket}</span> ·{' '}
                {dept?.name ?? 'Custom department'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Completed {new Date(scorecard.completedAt).toLocaleString()} · {formatHms(scorecard.totalElapsedSec)} on test
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall</p>
              <p className="text-5xl font-bold text-[#0c2340] mt-1 tabular-nums">
                {scorecard.percentage.toFixed(2)}%
              </p>
              <p className="text-sm text-slate-600 mt-1 tabular-nums">
                {scorecard.earnedMarks} / {scorecard.totalMarks} marks
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <RatingTile
              label="Placement readiness"
              value={scorecard.placementReadiness}
              badgeClass={readinessClass}
              subtitle={`${scorecard.percentage.toFixed(0)}% composite`}
            />
            <RatingTile
              label="Technical rating"
              value={`${scorecard.technicalRating.toFixed(0)}%`}
              badgeClass="bg-[#1e3a5f]"
            />
            <RatingTile
              label="Communication rating"
              value={`${scorecard.communicationRating.toFixed(0)}%`}
              badgeClass="bg-emerald-600"
            />
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Employability score
            </p>
            <div className="flex items-center gap-3">
              <Progress value={scorecard.employabilityScore} className="h-2 flex-1" />
              <span className="text-2xl font-bold text-[#0c2340] tabular-nums">
                {scorecard.employabilityScore.toFixed(0)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              50% Technical · 25% Communication · 25% Cognitive (Aptitude + Logic + IQ)
            </p>
          </div>
        </Card>

        <Card className="p-6 shadow-md border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Section-wise performance</h2>
          <div className="space-y-3">
            {scorecard.sections.map((s) => (
              <div
                key={s.sectionId}
                className="rounded-lg border border-slate-200 p-4 bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="text-sm text-slate-600 tabular-nums">
                    {s.earned.toFixed(2)} / {s.marks} marks · {s.percent.toFixed(2)}%
                  </p>
                </div>
                <Progress value={s.percent} className="h-1.5 mt-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-slate-600">
                  {s.total != null ? (
                    <>
                      <Stat label="Correct" value={s.correct ?? 0} />
                      <Stat label="Wrong" value={s.wrong ?? 0} />
                      <Stat label="Skipped" value={s.skipped ?? 0} />
                      <Stat label="Total" value={s.total} />
                    </>
                  ) : (
                    <>
                      <Stat label="Fluency" value={`${(s.fluency ?? 0).toFixed(0)}%`} />
                      <Stat label="Clarity" value={`${(s.clarity ?? 0).toFixed(0)}%`} />
                      <Stat label="Grammar" value={`${(s.grammar ?? 0).toFixed(0)}%`} />
                      <Stat label="Section %" value={`${s.percent.toFixed(0)}%`} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 shadow-md border-slate-200">
            <h3 className="text-base font-bold text-emerald-700 mb-3">Strengths</h3>
            {scorecard.strengths.length === 0 ? (
              <p className="text-sm text-slate-500">Keep building — practice more sections to surface strengths.</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-700">
                {scorecard.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-600">●</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6 shadow-md border-slate-200">
            <h3 className="text-base font-bold text-amber-700 mb-3">Areas to improve</h3>
            {scorecard.weaknesses.length === 0 ? (
              <p className="text-sm text-slate-500">No weak sections in this attempt — great work!</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-700">
                {scorecard.weaknesses.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-600">●</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-6 shadow-md border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-3">AI recommendations</h3>
          {scorecard.recommendations.length === 0 ? (
            <p className="text-sm text-slate-500">Solid run — repeat the assessment next month to track progress.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
              {scorecard.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button asChild className="bg-[#1e3a5f] hover:bg-[#16304f]">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/placement">Take another assessment</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RatingTile({
  label,
  value,
  badgeClass,
  subtitle,
}: {
  label: string;
  value: string;
  badgeClass: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 bg-white">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', badgeClass)} />
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
      {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-slate-50 px-2 py-1.5">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}
