'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ElevateXScorecardView } from '@/components/placement/elevatex-scorecard-view';
import { downloadElevateXScorecardPdf } from '@/lib/placement/elevatex-scorecard-pdf';
import { loadScorecardForAttempt } from '@/lib/placement/session';
import type { PlacementScorecard } from '@/lib/placement/types';

export default function PlacementResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const [scorecard, setScorecard] = useState<PlacementScorecard | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const local = loadScorecardForAttempt<PlacementScorecard & { attemptId?: string }>(attemptId);
      if (local) {
        if (!cancelled) {
          setScorecard(local);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/student/elevatex/scorecard/${encodeURIComponent(attemptId)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const json = (await res.json()) as { scorecard?: PlacementScorecard };
          if (json.scorecard && !cancelled) {
            setScorecard(json.scorecard);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through
      }

      if (!cancelled) {
        setMissing(true);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading your ElevateX scorecard…</p>
      </div>
    );
  }

  if (missing || !scorecard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-slate-700 max-w-md">
          We could not load your ElevateX scorecard. If you finished the exam on another device, sign in
          here and open the result link from your dashboard, or ask the exam cell to view your report.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <ElevateXScorecardView scorecard={scorecard} />

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button
            className="bg-[#1e3a5f] hover:bg-[#16304f]"
            onClick={() => downloadElevateXScorecardPdf(scorecard)}
          >
            Download scorecard (PDF)
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/placement">ElevateX hub</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
