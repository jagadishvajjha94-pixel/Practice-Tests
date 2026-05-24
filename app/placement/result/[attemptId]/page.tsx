'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PlacementResultPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1e3a5f]">Exam submitted</p>
        <h1 className="mt-3 text-2xl font-bold text-[#0c2340]">Thank you.</h1>
        <p className="mt-2 text-slate-700">
          Your response has been submitted successfully. You can now close this window.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Scores and scorecards are available only in the admin portal.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" onClick={() => window.close()}>
            Close window
          </Button>
          <Button asChild variant="outline">
            <Link href="/exams">Back to examinations</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
