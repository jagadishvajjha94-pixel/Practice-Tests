'use client';

import { useEffect, useState } from 'react';
import { getCountdownParts } from '@/lib/countdown';

type ExamCountdownProps = {
  targetIso: string;
  label?: string;
  compact?: boolean;
};

export function ExamCountdown({ targetIso, label = 'Starts in', compact = false }: ExamCountdownProps) {
  const [parts, setParts] = useState(() => getCountdownParts(targetIso));

  useEffect(() => {
    const tick = () => setParts(getCountdownParts(targetIso));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (parts.isPast) {
    return (
      <p className={compact ? 'text-xs font-semibold text-emerald-700' : 'text-sm font-semibold text-emerald-700'}>
        Live now
      </p>
    );
  }

  if (compact) {
    return (
      <p className="text-xs text-slate-600">
        <span className="font-semibold text-[#0c2340]">{label}</span>{' '}
        <span className="tabular-nums font-bold text-amber-800">
          {parts.hours}h {parts.minutes}m {parts.seconds}s
        </span>
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[#0c2340]">
        {parts.hours}
        <span className="text-base font-semibold text-slate-500">h</span> {parts.minutes}
        <span className="text-base font-semibold text-slate-500">m</span> {parts.seconds}
        <span className="text-base font-semibold text-slate-500">s</span>
      </p>
    </div>
  );
}
