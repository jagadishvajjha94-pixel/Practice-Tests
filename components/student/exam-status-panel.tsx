'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExamCountdown } from '@/components/student/exam-countdown';
import type { PortalExamItem } from '@/lib/student-portal';

export function ExamStatusPanel({
  live,
  upcoming,
}: {
  live: PortalExamItem[];
  upcoming: PortalExamItem[];
}) {
  if (live.length === 0 && upcoming.length === 0) {
    return (
      <Card className="p-4 border-slate-200 bg-slate-50/80">
        <p className="text-sm font-semibold text-slate-800">No scheduled tests</p>
        <p className="text-xs text-slate-600 mt-1">
          Check back when your examination cell publishes a schedule.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-slate-200 space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Exam status</p>
        <h2 className="text-lg font-bold text-[#0c2340] mt-0.5">Live & upcoming</h2>
      </div>

      {live.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Live now</p>
          {live.map((exam) => (
            <div key={exam.id} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-[#0c2340] leading-snug">
                  {exam.icon} {exam.title}
                </p>
                <Badge tone="success" className="shrink-0 text-[10px]">LIVE</Badge>
              </div>
              <p className="text-xs text-emerald-800 mt-1 font-medium">In progress — join now</p>
              <Link href={exam.href} className="block mt-2">
                <Button size="sm" className="w-full h-8 bg-emerald-700 hover:bg-emerald-800 text-xs">
                  Start test
                </Button>
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Upcoming</p>
          {upcoming.slice(0, 4).map((exam) => (
            <div key={exam.id} className="rounded-lg border border-amber-200/90 bg-amber-50/50 p-3">
              <p className="text-sm font-semibold text-[#0c2340] leading-snug">
                {exam.icon} {exam.title}
              </p>
              <ExamCountdown targetIso={exam.starts_at} compact />
              <p className="text-[11px] text-slate-500 mt-1">
                {new Date(exam.starts_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
