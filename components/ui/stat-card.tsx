import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'navy' | 'blue' | 'emerald' | 'cyan' | 'amber' | 'red' | 'indigo';
  className?: string;
};

const accentBar = {
  navy: 'bg-[#1e3a5f]',
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-600',
  cyan: 'bg-cyan-600',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-600',
} as const;

const valueTone = {
  navy: 'text-[#1e3a5f]',
  blue: 'text-blue-700',
  emerald: 'text-emerald-700',
  cyan: 'text-cyan-700',
  amber: 'text-amber-700',
  red: 'text-red-600',
  indigo: 'text-indigo-700',
} as const;

export function StatCard({ label, value, hint, accent = 'navy', className }: StatCardProps) {
  return (
    <div className={cn('app-stat-card', className)}>
      <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', accentBar[accent])} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 pl-2">
        {label}
      </p>
      <p className={cn('text-3xl font-bold tabular-nums pl-2', valueTone[accent])}>{value}</p>
      {hint ? <p className="text-xs text-slate-500 mt-2 pl-2 leading-relaxed">{hint}</p> : null}
    </div>
  );
}
